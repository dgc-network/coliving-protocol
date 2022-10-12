import logging  # pylint: disable=C0302
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Dict, List, Tuple, TypedDict

from flask import Blueprint, request
from redis import Redis
from sqlalchemy import desc
from sqlalchemy.orm.session import Session
from src import api_helpers
from src.models.indexing.block import Block
from src.models.notifications.milestone import Milestone, MilestoneName
from src.models.content_lists.content_list import ContentList
from src.models.rewards.challenge_disbursement import ChallengeDisbursement
from src.models.social.follow import Follow
from src.models.social.reaction import Reaction
from src.models.social.repost import Repost, RepostType
from src.models.social.save import Save, SaveType
from src.models.digitalContents.remix import Remix
from src.models.digitalContents.digital_content import DigitalContent
from src.models.users.aggregate_user import AggregateUser
from src.models.users.supporter_rank_up import SupporterRankUp
from src.models.users.user import User
from src.models.users.user_balance_change import UserBalanceChange
from src.models.users.user_tip import UserTip
from src.queries import response_name_constants as const
from src.queries.get_prev_digital_content_entries import get_prev_digital_content_entries
from src.utils import web3_provider
from src.utils.config import shared_config
from src.utils.db_session import get_db_read_replica
from src.utils.redis_connection import get_redis
from src.utils.redis_constants import (
    latest_sol_aggregate_tips_slot_key,
    latest_sol_plays_slot_key,
    latest_sol_rewards_manager_slot_key,
)
from src.utils.spl_digitalcoin import to_wei_string

logger = logging.getLogger(__name__)
bp = Blueprint("notifications", __name__)

max_block_diff = int(shared_config["discprov"]["notifications_max_block_diff"])
max_slot_diff = int(shared_config["discprov"]["notifications_max_slot_diff"])


# pylint: disable=R0911
def get_owner_id(session, entity_type, entity_id):
    """
    Fetches the owner user id of the requested entity_type/entity_id

    Args:
        session: (obj) The start block number for querying for notifications
        entity_type: (string) Must be either 'digital_content' | 'album' | 'contentList
        entity_id: (int) The id of the 'entity_type'

    Returns:
        owner_id: (int | None) The user id of the owner of the entity_type/entity_id
    """
    if entity_type == "digital_content":
        owner_id_query = (
            session.query(DigitalContent.owner_id)
            .filter(
                DigitalContent.digital_content_id == entity_id,
                DigitalContent.is_delete == False,
                DigitalContent.is_current == True,
            )
            .all()
        )
        if not owner_id_query:
            return None
        owner_id = owner_id_query[0][0]
        return owner_id

    if entity_type == "album":
        owner_id_query = (
            session.query(ContentList.content_list_owner_id)
            .filter(
                ContentList.content_list_id == entity_id,
                ContentList.is_delete == False,
                ContentList.is_current == True,
                ContentList.is_album == True,
            )
            .all()
        )
        if not owner_id_query:
            return None
        owner_id = owner_id_query[0][0]
        return owner_id

    if entity_type == "content_list":
        owner_id_query = (
            session.query(ContentList.content_list_owner_id)
            .filter(
                ContentList.content_list_id == entity_id,
                ContentList.is_delete == False,
                ContentList.is_current == True,
                ContentList.is_album == False,
            )
            .all()
        )
        if not owner_id_query:
            return None
        owner_id = owner_id_query[0][0]
        return owner_id

    return None


def get_cosign_remix_notifications(session, max_block_number, remix_digital_contents):
    """
    Get the notifications for remix digitalContents that are reposted/favorited by the parent remix author

    Args:
        session: (DB)
        max_block_number: (int)
        remix_digital_contents: (Array<{ }>)
            'user_id'
            'item_id'
            const.notification_blocknumber
            const.notification_timestamp
            'item_owner_id'

    Returns:
        Array of cosign notifications

    """
    if not remix_digital_contents:
        return []

    remix_notifications = []
    remix_digital_content_ids = [r["item_id"] for r in remix_digital_contents]

    # Query for all the parent digitalContents of the remix digitalContents
    digitalContents_subquery = (
        session.query(DigitalContent)
        .filter(
            DigitalContent.is_unlisted == False,
            DigitalContent.is_delete == False,
            DigitalContent.is_current == True,
        )
        .subquery()
    )

    parent_digital_contents = (
        session.query(
            Remix.child_digital_content_id, Remix.parent_digital_content_id, digitalContents_subquery.c.owner_id
        )
        .join(digitalContents_subquery, Remix.parent_digital_content_id == digitalContents_subquery.c.digital_content_id)
        .filter(Remix.child_digital_content_id.in_(remix_digital_content_ids))
        .all()
    )
    # Mapping of parent digital_content users to child digital_content to parent digital_content
    parent_digital_content_users_to_remixes = {}
    for digital_content_parent in parent_digital_contents:
        [remix_digital_content_id, remix_parent_id, remix_parent_user_id] = digital_content_parent
        if remix_parent_user_id not in parent_digital_content_users_to_remixes:
            parent_digital_content_users_to_remixes[remix_parent_user_id] = {
                remix_digital_content_id: remix_parent_id
            }
        else:
            parent_digital_content_users_to_remixes[remix_parent_user_id][
                remix_digital_content_id
            ] = remix_parent_id

    for remix_digital_content in remix_digital_contents:
        user_id = remix_digital_content["user_id"]
        digital_content_id = remix_digital_content["item_id"]

        if (
            user_id in parent_digital_content_users_to_remixes
            and digital_content_id in parent_digital_content_users_to_remixes[user_id]
        ):
            remix_notifications.append(
                {
                    const.notification_type: const.notification_type_remix_cosign,
                    const.notification_blocknumber: remix_digital_content[
                        const.notification_blocknumber
                    ],
                    const.notification_timestamp: remix_digital_content[
                        const.notification_timestamp
                    ],
                    const.notification_initiator: user_id,
                    const.notification_metadata: {
                        const.notification_entity_id: digital_content_id,
                        const.notification_entity_type: "digital_content",
                        const.notification_entity_owner_id: remix_digital_content[
                            "item_owner_id"
                        ],
                    },
                }
            )

    return remix_notifications


class GroupMilestones(TypedDict):
    digitalContents: Dict[int, int]
    albums: Dict[int, int]
    contentLists: Dict[int, int]


class MilestoneInfo(TypedDict):
    favorite_counts: GroupMilestones
    repost_counts: GroupMilestones
    follower_counts: Dict[int, int]


def get_milestone_info(
    session: Session, min_block_number, max_block_number
) -> MilestoneInfo:
    milestones_in_block = session.query(
        Milestone.name, Milestone.id, Milestone.threshold
    ).filter(
        Milestone.blocknumber > min_block_number,
        Milestone.blocknumber <= max_block_number,
    )
    milestones = defaultdict(list)

    for milestone_name, *id_threshold in milestones_in_block:
        milestones[milestone_name].append(id_threshold)

    milestone_content_list_ids = [
        content_list_id
        for name, content_list_id, _ in milestones_in_block
        if name
        in (
            MilestoneName.CONTENT_LIST_REPOST_COUNT,
            MilestoneName.CONTENT_LIST_SAVE_COUNT,
        )
    ]

    content_list_id_albums: Dict[int, bool] = {}
    if milestone_content_list_ids:
        content_list_id_albums_response = (
            session.query(ContentList.content_list_id, ContentList.is_album)
            .filter(
                ContentList.is_current == True,
                ContentList.content_list_id.in_(milestone_content_list_ids),
            )
            .all()
        )
        content_list_id_albums = dict(content_list_id_albums_response)

    album_favorites: List[Tuple[int, int]] = []
    content_list_favorites: List[Tuple[int, int]] = []
    for id, threshold in milestones.get(MilestoneName.CONTENT_LIST_SAVE_COUNT, []):
        if id in content_list_id_albums and content_list_id_albums[id]:
            album_favorites.append((id, threshold))
        else:
            content_list_favorites.append((id, threshold))

    album_reposts: List[Tuple[int, int]] = []
    content_list_reposts: List[Tuple[int, int]] = []
    for id, threshold in milestones.get(MilestoneName.CONTENT_LIST_REPOST_COUNT, []):
        if id in content_list_id_albums and content_list_id_albums[id]:
            album_reposts.append((id, threshold))
        else:
            content_list_reposts.append((id, threshold))

    favorite_milestones: GroupMilestones = {
        "digitalContents": dict(milestones.get(MilestoneName.AGREEMENT_SAVE_COUNT, [])),
        "albums": dict(album_favorites),
        "content_lists": dict(content_list_favorites),
    }

    repost_milestones: GroupMilestones = {
        "digitalContents": dict(milestones.get(MilestoneName.AGREEMENT_REPOST_COUNT, [])),
        "albums": dict(album_reposts),
        "content_lists": dict(content_list_reposts),
    }

    milestone_info: MilestoneInfo = {
        "follower_counts": dict(milestones.get(MilestoneName.FOLLOWER_COUNT, [])),
        "repost_counts": repost_milestones,
        "favorite_counts": favorite_milestones,
    }
    return milestone_info


@bp.route("/notifications", methods=("GET",))
# pylint: disable=R0915
def notifications():
    """
    Fetches the notifications events that occurred between the given block numbers

    URL Params:
        min_block_number: (int) The start block number for querying for notifications
        max_block_number?: (int) The end block number for querying for notifications
        digital_content_id?: (Array<int>) Array of digital_content id for fetching the digital_content's owner id
            and adding the digital_content id to owner user id mapping to the `owners` response field
            NOTE: this is added for notification for listen counts

    Response - Json object w/ the following fields
        notifications: Array of notifications of shape:
            type: 'Follow' | 'Favorite' | 'Repost' | 'Create' | 'RemixCreate' | 'RemixCosign' | 'ContentListUpdate'
            blocknumber: (int) blocknumber of notification
            timestamp: (string) timestamp of notification
            initiator: (int) the user id that caused this notification
            metadata?: (any) additional information about the notification
                entity_id?: (int) the id of the target entity (ie. contentList id of a contentList that is reposted)
                entity_type?: (string) the type of the target entity
                entity_owner_id?: (int) the id of the target entity's owner (if applicable)
                content_list_update_timestamp?: (string) timestamp of last update of a given contentList
                content_list_update_users?: (array<int>) user ids which favorited a given contentList

        info: Dictionary of metadata w/ min_block_number & max_block_number fields

        milestones: Dictionary mapping of follows/reposts/favorites (processed within the blocks params)
            Root fields:
                follower_counts: Contains a dictionary of user id => follower count (up to the max_block_number)
                repost_counts: Contains a dictionary digitalContents/albums/contentLists of id to repost count
                favorite_counts: Contains a dictionary digitalContents/albums/contentLists of id to favorite count

        owners: Dictionary containing the mapping for digital_content id / contentList id / album -> owner user id
            The root keys are 'digitalContents', 'contentLists', 'albums' and each contains the id to owner id mapping
    """

    db = get_db_read_replica()
    web3 = web3_provider.get_web3()
    min_block_number = request.args.get("min_block_number", type=int)
    max_block_number = request.args.get("max_block_number", type=int)

    digital_content_ids_to_owner = []
    try:
        digital_content_ids_str_list = request.args.getlist("digital_content_id")
        digital_content_ids_to_owner = [int(y) for y in digital_content_ids_str_list]
    except Exception as e:
        logger.error(f"Failed to retrieve digital_content list {e}")

    # Max block number is not explicitly required (yet)
    if not min_block_number and min_block_number != 0:
        return api_helpers.error_response({"msg": "Missing min block number"}, 400)

    if not max_block_number:
        max_block_number = min_block_number + max_block_diff
    elif (max_block_number - min_block_number) > max_block_diff:
        max_block_number = min_block_number + max_block_diff

    with db.scoped_session() as session:
        current_block_query = session.query(Block).filter_by(is_current=True)
        current_block_query_results = current_block_query.all()
        current_block = current_block_query_results[0]
        current_max_block_num = current_block.number
        if current_max_block_num < max_block_number:
            max_block_number = current_max_block_num

    notification_metadata = {
        "min_block_number": min_block_number,
        "max_block_number": max_block_number,
    }

    # Retrieve milestones statistics
    milestone_info = {}

    # Cache owner info for network entities and pass in w/results
    owner_info = {const.digitalContents: {}, const.albums: {}, const.contentLists: {}}

    start_time = datetime.now()
    logger.info(f"notifications.py | start_time ${start_time}")

    # List of notifications generated from current protocol state
    notifications_unsorted = []
    with db.scoped_session() as session:
        #
        # Query relevant follow information
        #
        follow_query = session.query(Follow)

        # Impose min block number restriction
        follow_query = follow_query.filter(
            Follow.is_current == True,
            Follow.is_delete == False,
            Follow.blocknumber > min_block_number,
            Follow.blocknumber <= max_block_number,
        )

        follow_results = follow_query.all()
        # Represents all follow notifications
        follow_notifications = []
        for entry in follow_results:
            follow_notif = {
                const.notification_type: const.notification_type_follow,
                const.notification_blocknumber: entry.blocknumber,
                const.notification_timestamp: entry.created_at,
                const.notification_initiator: entry.follower_user_id,
                const.notification_metadata: {
                    const.notification_follower_id: entry.follower_user_id,
                    const.notification_followee_id: entry.followee_user_id,
                },
            }
            follow_notifications.append(follow_notif)

        notifications_unsorted.extend(follow_notifications)

        logger.info(f"notifications.py | followers at {datetime.now() - start_time}")

        #
        # Query relevant favorite information
        #
        favorites_query = session.query(Save)
        favorites_query = favorites_query.filter(
            Save.is_current == True,
            Save.is_delete == False,
            Save.blocknumber > min_block_number,
            Save.blocknumber <= max_block_number,
        )
        favorite_results = favorites_query.all()

        # ID lists to query count aggregates
        favorited_digital_content_ids = []
        favorited_album_ids = []
        favorited_content_list_ids = []

        # List of favorite notifications
        favorite_notifications = []
        favorite_remix_digital_contents = []

        for entry in favorite_results:
            favorite_notif = {
                const.notification_type: const.notification_type_favorite,
                const.notification_blocknumber: entry.blocknumber,
                const.notification_timestamp: entry.created_at,
                const.notification_initiator: entry.user_id,
            }
            save_type = entry.save_type
            save_item_id = entry.save_item_id
            metadata = {
                const.notification_entity_type: save_type,
                const.notification_entity_id: save_item_id,
            }

            # NOTE if deleted, the favorite can still exist
            # TODO: Can we aggregate all owner queries and perform at once...?
            if save_type == SaveType.digital_content:
                owner_id = get_owner_id(session, "digital_content", save_item_id)
                if not owner_id:
                    continue
                metadata[const.notification_entity_owner_id] = owner_id
                favorited_digital_content_ids.append(save_item_id)
                owner_info[const.digitalContents][save_item_id] = owner_id

                favorite_remix_digital_contents.append(
                    {
                        const.notification_blocknumber: entry.blocknumber,
                        const.notification_timestamp: entry.created_at,
                        "user_id": entry.user_id,
                        "item_owner_id": owner_id,
                        "item_id": save_item_id,
                    }
                )

            elif save_type == SaveType.album:
                owner_id = get_owner_id(session, "album", save_item_id)
                if not owner_id:
                    continue
                metadata[const.notification_entity_owner_id] = owner_id
                favorited_album_ids.append(save_item_id)
                owner_info[const.albums][save_item_id] = owner_id

            elif save_type == SaveType.contentList:
                owner_id = get_owner_id(session, "content_list", save_item_id)
                if not owner_id:
                    continue
                metadata[const.notification_entity_owner_id] = owner_id
                favorited_content_list_ids.append(save_item_id)
                owner_info[const.contentLists][save_item_id] = owner_id

            favorite_notif[const.notification_metadata] = metadata
            favorite_notifications.append(favorite_notif)
        notifications_unsorted.extend(favorite_notifications)

        if favorited_digital_content_ids:
            favorite_remix_notifications = get_cosign_remix_notifications(
                session, max_block_number, favorite_remix_digital_contents
            )
            notifications_unsorted.extend(favorite_remix_notifications)

        logger.info(f"notifications.py | favorites at {datetime.now() - start_time}")

        #
        # Query relevant tier change information
        #
        balance_change_query = session.query(UserBalanceChange)

        # Impose min block number restriction
        balance_change_query = balance_change_query.filter(
            UserBalanceChange.blocknumber > min_block_number,
            UserBalanceChange.blocknumber <= max_block_number,
        )

        balance_change_results = balance_change_query.all()
        tier_change_notifications = []

        for entry in balance_change_results:
            prev = int(entry.previous_balance)
            current = int(entry.current_balance)
            # Check for a tier change and add to tier_change_notification
            tier = None
            if prev < 100000 <= current:
                tier = "platinum"
            elif prev < 10000 <= current:
                tier = "gold"
            elif prev < 100 <= current:
                tier = "silver"
            elif prev < 10 <= current:
                tier = "bronze"

            if tier is not None:
                tier_change_notif = {
                    const.notification_type: const.notification_type_tier_change,
                    const.notification_blocknumber: entry.blocknumber,
                    const.notification_timestamp: datetime.now(),
                    const.notification_initiator: entry.user_id,
                    const.notification_metadata: {
                        const.notification_tier: tier,
                    },
                }
                tier_change_notifications.append(tier_change_notif)

        notifications_unsorted.extend(tier_change_notifications)

        logger.info(
            f"notifications.py | balance change at {datetime.now() - start_time}"
        )

        #
        # Query relevant repost information
        #
        repost_query = session.query(Repost)
        repost_query = repost_query.filter(
            Repost.is_current == True,
            Repost.is_delete == False,
            Repost.blocknumber > min_block_number,
            Repost.blocknumber <= max_block_number,
        )
        repost_results = repost_query.all()

        # ID lists to query counts
        reposted_digital_content_ids = []
        reposted_album_ids = []
        reposted_content_list_ids = []

        # List of repost notifications
        repost_notifications = []

        # List of repost notifications
        repost_remix_notifications = []
        repost_remix_digital_contents = []

        for entry in repost_results:
            repost_notif = {
                const.notification_type: const.notification_type_repost,
                const.notification_blocknumber: entry.blocknumber,
                const.notification_timestamp: entry.created_at,
                const.notification_initiator: entry.user_id,
            }
            repost_type = entry.repost_type
            repost_item_id = entry.repost_item_id
            metadata = {
                const.notification_entity_type: repost_type,
                const.notification_entity_id: repost_item_id,
            }
            if repost_type == RepostType.digital_content:
                owner_id = get_owner_id(session, "digital_content", repost_item_id)
                if not owner_id:
                    continue
                metadata[const.notification_entity_owner_id] = owner_id
                reposted_digital_content_ids.append(repost_item_id)
                owner_info[const.digitalContents][repost_item_id] = owner_id
                repost_remix_digital_contents.append(
                    {
                        const.notification_blocknumber: entry.blocknumber,
                        const.notification_timestamp: entry.created_at,
                        "user_id": entry.user_id,
                        "item_owner_id": owner_id,
                        "item_id": repost_item_id,
                    }
                )

            elif repost_type == RepostType.album:
                owner_id = get_owner_id(session, "album", repost_item_id)
                if not owner_id:
                    continue
                metadata[const.notification_entity_owner_id] = owner_id
                reposted_album_ids.append(repost_item_id)
                owner_info[const.albums][repost_item_id] = owner_id

            elif repost_type == RepostType.contentList:
                owner_id = get_owner_id(session, "content_list", repost_item_id)
                if not owner_id:
                    continue
                metadata[const.notification_entity_owner_id] = owner_id
                reposted_content_list_ids.append(repost_item_id)
                owner_info[const.contentLists][repost_item_id] = owner_id

            repost_notif[const.notification_metadata] = metadata
            repost_notifications.append(repost_notif)

        # Append repost notifications
        notifications_unsorted.extend(repost_notifications)

        # Aggregate repost counts for relevant fields
        # Used to notify users of entity-specific milestones
        if reposted_digital_content_ids:
            repost_remix_notifications = get_cosign_remix_notifications(
                session, max_block_number, repost_remix_digital_contents
            )
            notifications_unsorted.extend(repost_remix_notifications)

        # Query relevant created entity notification - digitalContents/albums/contentLists
        created_notifications = []

        logger.info(f"notifications.py | reposts at {datetime.now() - start_time}")

        #
        # Query relevant created digitalContents for remix information
        #
        remix_created_notifications = []

        # Aggregate digital_content notifs
        digitalContents_query = session.query(DigitalContent)
        # TODO: Is it valid to use DigitalContent.is_current here? Might not be the right info...
        digitalContents_query = digitalContents_query.filter(
            DigitalContent.is_unlisted == False,
            DigitalContent.is_delete == False,
            DigitalContent.stem_of == None,
            DigitalContent.blocknumber > min_block_number,
            DigitalContent.blocknumber <= max_block_number,
        )
        digitalContents_query = digitalContents_query.filter(DigitalContent.created_at == DigitalContent.updated_at)
        digital_content_results = digitalContents_query.all()
        for entry in digital_content_results:
            digital_content_notif = {
                const.notification_type: const.notification_type_create,
                const.notification_blocknumber: entry.blocknumber,
                const.notification_timestamp: entry.created_at,
                const.notification_initiator: entry.owner_id,
                # TODO: is entity owner id necessary for digitalContents?
                const.notification_metadata: {
                    const.notification_entity_type: "digital_content",
                    const.notification_entity_id: entry.digital_content_id,
                    const.notification_entity_owner_id: entry.owner_id,
                },
            }
            created_notifications.append(digital_content_notif)

            if entry.remix_of:
                # Add notification to remix digital_content owner
                parent_remix_digital_contents = [
                    t["parent_digital_content_id"] for t in entry.remix_of["digitalContents"]
                ]
                remix_digital_content_parents = (
                    session.query(DigitalContent.owner_id, DigitalContent.digital_content_id)
                    .filter(
                        DigitalContent.digital_content_id.in_(parent_remix_digital_contents),
                        DigitalContent.is_unlisted == False,
                        DigitalContent.is_delete == False,
                        DigitalContent.is_current == True,
                    )
                    .all()
                )
                for remix_digital_content_parent in remix_digital_content_parents:
                    [
                        remix_digital_content_parent_owner,
                        remix_digital_content_parent_id,
                    ] = remix_digital_content_parent
                    remix_notif = {
                        const.notification_type: const.notification_type_remix_create,
                        const.notification_blocknumber: entry.blocknumber,
                        const.notification_timestamp: entry.created_at,
                        const.notification_initiator: entry.owner_id,
                        # TODO: is entity owner id necessary for digitalContents?
                        const.notification_metadata: {
                            const.notification_entity_type: "digital_content",
                            const.notification_entity_id: entry.digital_content_id,
                            const.notification_entity_owner_id: entry.owner_id,
                            const.notification_remix_parent_digital_content_user_id: remix_digital_content_parent_owner,
                            const.notification_remix_parent_digital_content_id: remix_digital_content_parent_id,
                        },
                    }
                    remix_created_notifications.append(remix_notif)

        logger.info(f"notifications.py | remixes at {datetime.now() - start_time}")

        # Handle digital_content update notifications
        # TODO: Consider switching blocknumber for updated at?
        updated_digital_contents_query = session.query(DigitalContent)
        updated_digital_contents_query = updated_digital_contents_query.filter(
            DigitalContent.is_unlisted == False,
            DigitalContent.stem_of == None,
            DigitalContent.created_at != DigitalContent.updated_at,
            DigitalContent.blocknumber > min_block_number,
            DigitalContent.blocknumber <= max_block_number,
        )
        updated_digital_contents = updated_digital_contents_query.all()

        prev_digital_contents = get_prev_digital_content_entries(session, updated_digital_contents)

        for prev_entry in prev_digital_contents:
            entry = next(t for t in updated_digital_contents if t.digital_content_id == prev_entry.digital_content_id)
            logger.info(
                f"notifications.py | single digital_content update {entry.digital_content_id} {entry.blocknumber} {datetime.now() - start_time}"
            )

            # DigitalContents that were unlisted and turned to public
            if prev_entry.is_unlisted == True:
                logger.info(
                    f"notifications.py | single digital_content update to public {datetime.now() - start_time}"
                )
                digital_content_notif = {
                    const.notification_type: const.notification_type_create,
                    const.notification_blocknumber: entry.blocknumber,
                    const.notification_timestamp: entry.created_at,
                    const.notification_initiator: entry.owner_id,
                    # TODO: is entity owner id necessary for digitalContents?
                    const.notification_metadata: {
                        const.notification_entity_type: "digital_content",
                        const.notification_entity_id: entry.digital_content_id,
                        const.notification_entity_owner_id: entry.owner_id,
                    },
                }
                created_notifications.append(digital_content_notif)

            # DigitalContents that were not remixes and turned into remixes
            if not prev_entry.remix_of and entry.remix_of:
                # Add notification to remix digital_content owner
                parent_remix_digital_contents = [
                    t["parent_digital_content_id"] for t in entry.remix_of["digitalContents"]
                ]
                remix_digital_content_parents = (
                    session.query(DigitalContent.owner_id, DigitalContent.digital_content_id)
                    .filter(
                        DigitalContent.digital_content_id.in_(parent_remix_digital_contents),
                        DigitalContent.is_unlisted == False,
                        DigitalContent.is_delete == False,
                        DigitalContent.is_current == True,
                    )
                    .all()
                )
                logger.info(
                    f"notifications.py | single digital_content update parents {remix_digital_content_parents} {datetime.now() - start_time}"
                )
                for remix_digital_content_parent in remix_digital_content_parents:
                    [
                        remix_digital_content_parent_owner,
                        remix_digital_content_parent_id,
                    ] = remix_digital_content_parent
                    remix_notif = {
                        const.notification_type: const.notification_type_remix_create,
                        const.notification_blocknumber: entry.blocknumber,
                        const.notification_timestamp: entry.created_at,
                        const.notification_initiator: entry.owner_id,
                        # TODO: is entity owner id necessary for digitalContents?
                        const.notification_metadata: {
                            const.notification_entity_type: "digital_content",
                            const.notification_entity_id: entry.digital_content_id,
                            const.notification_entity_owner_id: entry.owner_id,
                            const.notification_remix_parent_digital_content_user_id: remix_digital_content_parent_owner,
                            const.notification_remix_parent_digital_content_id: remix_digital_content_parent_id,
                        },
                    }
                    remix_created_notifications.append(remix_notif)

        notifications_unsorted.extend(remix_created_notifications)

        logger.info(
            f"notifications.py | digital_content updates at {datetime.now() - start_time}"
        )

        # Aggregate contentList/album notifs
        collection_query = session.query(ContentList)
        # TODO: Is it valid to use is_current here? Might not be the right info...
        collection_query = collection_query.filter(
            ContentList.is_delete == False,
            ContentList.is_private == False,
            ContentList.blocknumber > min_block_number,
            ContentList.blocknumber <= max_block_number,
        )
        collection_query = collection_query.filter(
            ContentList.created_at == ContentList.updated_at
        )
        collection_results = collection_query.all()

        for entry in collection_results:
            collection_notif = {
                const.notification_type: const.notification_type_create,
                const.notification_blocknumber: entry.blocknumber,
                const.notification_timestamp: entry.created_at,
                const.notification_initiator: entry.content_list_owner_id,
            }
            metadata = {
                const.notification_entity_id: entry.content_list_id,
                const.notification_entity_owner_id: entry.content_list_owner_id,
                const.notification_collection_content: entry.content_list_contents,
            }

            if entry.is_album:
                metadata[const.notification_entity_type] = "album"
            else:
                metadata[const.notification_entity_type] = "content_list"
            collection_notif[const.notification_metadata] = metadata
            created_notifications.append(collection_notif)

        # ContentLists that were private and turned to public aka 'published'
        # TODO: Consider switching blocknumber for updated at?
        publish_content_lists_query = session.query(ContentList)
        publish_content_lists_query = publish_content_lists_query.filter(
            ContentList.is_private == False,
            ContentList.created_at != ContentList.updated_at,
            ContentList.blocknumber > min_block_number,
            ContentList.blocknumber <= max_block_number,
        )
        publish_content_list_results = publish_content_lists_query.all()
        for entry in publish_content_list_results:
            prev_entry_query = (
                session.query(ContentList)
                .filter(
                    ContentList.content_list_id == entry.content_list_id,
                    ContentList.blocknumber < entry.blocknumber,
                )
                .order_by(desc(ContentList.blocknumber))
            )
            # Previous private entry indicates transition to public, triggering a notification
            prev_entry = prev_entry_query.first()
            if prev_entry.is_private == True:
                publish_content_list_notif = {
                    const.notification_type: const.notification_type_create,
                    const.notification_blocknumber: entry.blocknumber,
                    const.notification_timestamp: entry.created_at,
                    const.notification_initiator: entry.content_list_owner_id,
                }
                metadata = {
                    const.notification_entity_id: entry.content_list_id,
                    const.notification_entity_owner_id: entry.content_list_owner_id,
                    const.notification_collection_content: entry.content_list_contents,
                    const.notification_entity_type: "content_list",
                }
                publish_content_list_notif[const.notification_metadata] = metadata
                created_notifications.append(publish_content_list_notif)

        # ContentLists that had digitalContents added to them
        # Get all contentLists that were modified over this range
        content_list_digital_content_added_query = session.query(ContentList).filter(
            ContentList.is_current == True,
            ContentList.is_delete == False,
            ContentList.is_private == False,
            ContentList.blocknumber > min_block_number,
            ContentList.blocknumber <= max_block_number,
        )
        content_list_digital_content_added_results = content_list_digital_content_added_query.all()
        # Loop over all contentList updates and determine if there were digitalContents added
        # at the block that the contentList update is at
        digital_content_added_to_content_list_notifications = []
        digital_content_ids = []
        for entry in content_list_digital_content_added_results:
            # Get the digital_content_ids from entry["content_list_contents"]
            if not entry.content_list_contents["digital_content_ids"]:
                # skip empty contentLists
                continue
            content_list_contents = entry.content_list_contents
            min_block = web3.eth.get_block(min_block_number)
            max_block = web3.eth.get_block(max_block_number)

            for digital_content in content_list_contents["digital_content_ids"]:
                digital_content_id = digital_content["digital_content"]
                digital_content_timestamp = digital_content["time"]
                # We know that this digital_content was added to the contentList at this specific update
                if (
                    min_block.timestamp < digital_content_timestamp
                    and digital_content_timestamp <= max_block.timestamp
                ):
                    digital_content_ids.append(digital_content_id)
                    digital_content_added_to_content_list_notification = {
                        const.notification_type: const.notification_type_add_digital_content_to_content_list,
                        const.notification_blocknumber: entry.blocknumber,
                        const.notification_timestamp: entry.created_at,
                        const.notification_initiator: entry.content_list_owner_id,
                    }
                    metadata = {
                        const.content_list_id: entry.content_list_id,
                        const.digital_content_id: digital_content_id,
                    }
                    digital_content_added_to_content_list_notification[
                        const.notification_metadata
                    ] = metadata
                    digital_content_added_to_content_list_notifications.append(
                        digital_content_added_to_content_list_notification
                    )

        digitalContents = (
            session.query(DigitalContent.owner_id, DigitalContent.digital_content_id)
            .filter(
                DigitalContent.digital_content_id.in_(digital_content_ids),
                DigitalContent.is_unlisted == False,
                DigitalContent.is_delete == False,
                DigitalContent.is_current == True,
            )
            .all()
        )
        digital_content_owner_map = {}
        for digital_content in digitalContents:
            owner_id, digital_content_id = digital_content
            digital_content_owner_map[digital_content_id] = owner_id

        # Loop over notifications and populate their metadata
        for notification in digital_content_added_to_content_list_notifications:
            digital_content_id = notification[const.notification_metadata][const.digital_content_id]
            if digital_content_id not in digital_content_owner_map:
                # Note: if digital_content_id not in digital_content_owner_map, it's because the digital_content is either deleted, unlisted, or doesn't exist
                # In that case, it should not trigger a notification
                continue
            else:
                digital_content_owner_id = digital_content_owner_map[digital_content_id]
                if digital_content_owner_id != notification[const.notification_initiator]:
                    # add digitalContents that don't belong to the contentList owner
                    notification[const.notification_metadata][
                        const.digital_content_owner_id
                    ] = digital_content_owner_id
                    created_notifications.append(notification)

        notifications_unsorted.extend(created_notifications)

        logger.info(f"notifications.py | contentLists at {datetime.now() - start_time}")

        # Get additional owner info as requested for listen counts
        digitalContents_owner_query = session.query(DigitalContent).filter(
            DigitalContent.is_current == True, DigitalContent.digital_content_id.in_(digital_content_ids_to_owner)
        )
        digital_content_owner_results = digitalContents_owner_query.all()
        for entry in digital_content_owner_results:
            owner = entry.owner_id
            digital_content_id = entry.digital_content_id
            owner_info[const.digitalContents][digital_content_id] = owner

        logger.info(
            f"notifications.py | owner info at {datetime.now() - start_time}, owners {len(digital_content_owner_results)}"
        )

        # Get contentList updates
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)
        thirty_days_ago_time = datetime(
            thirty_days_ago.year, thirty_days_ago.month, thirty_days_ago.day, 0, 0, 0
        )
        content_list_update_query = session.query(ContentList)
        content_list_update_query = content_list_update_query.filter(
            ContentList.is_current == True,
            ContentList.is_delete == False,
            ContentList.last_added_to >= thirty_days_ago_time,
            ContentList.blocknumber > min_block_number,
            ContentList.blocknumber <= max_block_number,
        )

        content_list_update_results = content_list_update_query.all()

        logger.info(
            f"notifications.py | get contentList updates at {datetime.now() - start_time}, contentList updates {len(content_list_update_results)}"
        )

        # Represents all contentList update notifications
        content_list_update_notifications = []
        content_list_update_notifs_by_content_list_id = {}
        for entry in content_list_update_results:
            content_list_update_notifs_by_content_list_id[entry.content_list_id] = {
                const.notification_type: const.notification_type_content_list_update,
                const.notification_blocknumber: entry.blocknumber,
                const.notification_timestamp: entry.created_at,
                const.notification_initiator: entry.content_list_owner_id,
                const.notification_metadata: {
                    const.notification_entity_id: entry.content_list_id,
                    const.notification_entity_type: "content_list",
                    const.notification_content_list_update_timestamp: entry.last_added_to,
                },
            }

        # get all favorited contentLists
        # contentLists may have been favorited outside the blocknumber bounds
        # e.g. before the min_block_number
        content_list_favorites_query = session.query(Save)
        content_list_favorites_query = content_list_favorites_query.filter(
            Save.is_current == True,
            Save.is_delete == False,
            Save.save_type == SaveType.contentList,
            Save.save_item_id.in_(content_list_update_notifs_by_content_list_id.keys()),
        )
        content_list_favorites_results = content_list_favorites_query.all()

        logger.info(
            f"notifications.py | get contentList favorites {datetime.now() - start_time}, contentList favorites {len(content_list_favorites_results)}"
        )

        # dictionary of contentList id => users that favorited said contentList
        # e.g. { contentList1: [user1, user2, ...], ... }
        # we need this dictionary to know which users need to be notified of a contentList update
        users_that_favorited_content_lists_dict = {}
        for result in content_list_favorites_results:
            if result.save_item_id in users_that_favorited_content_lists_dict:
                users_that_favorited_content_lists_dict[result.save_item_id].append(
                    result.user_id
                )
            else:
                users_that_favorited_content_lists_dict[result.save_item_id] = [
                    result.user_id
                ]

        logger.info(
            f"notifications.py | computed users that favorited dict {datetime.now() - start_time}"
        )

        for content_list_id in users_that_favorited_content_lists_dict:
            # TODO: We probably do not need this check because we are filtering
            # content_list_favorites_query to only matching ids
            if content_list_id not in content_list_update_notifs_by_content_list_id:
                continue
            content_list_update_notif = content_list_update_notifs_by_content_list_id[content_list_id]
            content_list_update_notif[const.notification_metadata].update(
                {
                    const.notification_content_list_update_users: users_that_favorited_content_lists_dict[
                        content_list_id
                    ]
                }
            )
            content_list_update_notifications.append(content_list_update_notif)

        notifications_unsorted.extend(content_list_update_notifications)

        logger.info(
            f"notifications.py | all contentList updates at {datetime.now() - start_time}"
        )

        milestone_info = get_milestone_info(session, min_block_number, max_block_number)

    # Final sort - TODO: can we sort by timestamp?
    sorted_notifications = sorted(
        notifications_unsorted,
        key=lambda i: i[const.notification_blocknumber],
        reverse=False,
    )

    logger.info(
        f"notifications.py | sorted notifications {datetime.now() - start_time}"
    )

    return api_helpers.success_response(
        {
            "notifications": sorted_notifications,
            "info": notification_metadata,
            "milestones": milestone_info,
            "owners": owner_info,
        }
    )


def get_max_slot(redis: Redis):
    listen_milestone_slot = redis.get(latest_sol_plays_slot_key)
    if listen_milestone_slot:
        listen_milestone_slot = int(listen_milestone_slot)

    rewards_manager_slot = redis.get(latest_sol_rewards_manager_slot_key)
    if rewards_manager_slot:
        rewards_manager_slot = int(rewards_manager_slot)

    supporter_rank_up_slot = redis.get(latest_sol_aggregate_tips_slot_key)
    if supporter_rank_up_slot:
        supporter_rank_up_slot = int(supporter_rank_up_slot)

    all_slots = list(
        filter(
            lambda x: x is not None,
            [listen_milestone_slot, rewards_manager_slot, supporter_rank_up_slot],
        )
    )
    logger.info(
        f"notifications.py | get_max_slot() | listen_milestone_slot:{listen_milestone_slot} rewards_manager_slot:{rewards_manager_slot} supporter_rank_up_slot:{supporter_rank_up_slot}"
    )
    if len(all_slots) == 0:
        return 0
    return min(all_slots)


@bp.route("/solana_notifications", methods=("GET",))
def solana_notifications():
    """
    Fetches the notifications events that occurred between the given slot numbers

    URL Params:
        min_slot_number: (int) The start slot number for querying for notifications
        max_slot_number?: (int) The end slot number for querying for notifications

    Response - Json object w/ the following fields
        notifications: Array of notifications of shape:
            type: 'ChallengeReward' | 'MilestoneListen' | 'SupporterRankUp' | 'Reaction'
            slot: (int) slot number of notification
            initiator: (int) the user id that caused this notification
            metadata?: (any) additional information about the notification
                challenge_id?: (int) completed challenge id for challenge reward notifications

        info: Dictionary of metadata w/ min_slot_number & max_slot_number fields
    """
    db = get_db_read_replica()
    redis = get_redis()
    min_slot_number = request.args.get("min_slot_number", type=int)
    max_slot_number = request.args.get("max_slot_number", type=int)

    # Max slot number is not explicitly required (yet)
    if not min_slot_number and min_slot_number != 0:
        return api_helpers.error_response({"msg": "Missing min slot number"}, 400)

    if not max_slot_number or (max_slot_number - min_slot_number) > max_slot_diff:
        max_slot_number = min_slot_number + max_slot_diff

    max_valid_slot = get_max_slot(redis)
    max_slot_number = min(max_slot_number, max_valid_slot)

    notifications_unsorted = []
    notification_metadata = {
        "min_slot_number": min_slot_number,
        "max_slot_number": max_slot_number,
    }

    with db.scoped_session() as session:
        #
        # Query relevant challenge disbursement information for challenge reward notifications
        #
        challenge_disbursement_results = (
            session.query(ChallengeDisbursement)
            .filter(
                ChallengeDisbursement.slot > min_slot_number,
                ChallengeDisbursement.slot <= max_slot_number,
            )
            .all()
        )

        challenge_reward_notifications = []
        for result in challenge_disbursement_results:
            challenge_reward_notifications.append(
                {
                    const.solana_notification_type: const.solana_notification_type_challenge_reward,
                    const.solana_notification_slot: result.slot,
                    const.solana_notification_initiator: result.user_id,
                    const.solana_notification_metadata: {
                        const.solana_notification_challenge_id: result.challenge_id,
                    },
                }
            )

        digital_content_listen_milestone: List[Tuple(Milestone, int)] = (
            session.query(Milestone, DigitalContent.owner_id)
            .filter(
                Milestone.name == MilestoneName.LISTEN_COUNT,
                Milestone.slot > min_slot_number,
                Milestone.slot <= max_slot_number,
            )
            .join(DigitalContent, DigitalContent.digital_content_id == Milestone.id and DigitalContent.is_current == True)
            .all()
        )

        digital_content_listen_milestones = []
        for result in digital_content_listen_milestone:
            digital_content_milestone, digital_content_owner_id = result
            digital_content_listen_milestones.append(
                {
                    const.solana_notification_type: const.solana_notification_type_listen_milestone,
                    const.solana_notification_slot: digital_content_milestone.slot,
                    const.solana_notification_initiator: digital_content_owner_id,  # owner_id
                    const.solana_notification_metadata: {
                        const.solana_notification_threshold: digital_content_milestone.threshold,
                        const.notification_entity_id: digital_content_milestone.id,  # digital_content_id
                        const.notification_entity_type: "digital_content",
                    },
                }
            )

        supporter_rank_ups_result = (
            session.query(SupporterRankUp)
            .filter(
                SupporterRankUp.slot > min_slot_number,
                SupporterRankUp.slot <= max_slot_number,
            )
            .all()
        )
        supporter_rank_ups = []
        for supporter_rank_up in supporter_rank_ups_result:
            supporter_rank_ups.append(
                {
                    const.solana_notification_type: const.solana_notification_type_supporter_rank_up,
                    const.solana_notification_slot: supporter_rank_up.slot,
                    const.solana_notification_initiator: supporter_rank_up.receiver_user_id,
                    const.solana_notification_metadata: {
                        const.notification_entity_id: supporter_rank_up.sender_user_id,
                        const.notification_entity_type: "user",
                        const.solana_notification_tip_rank: supporter_rank_up.rank,
                    },
                }
            )

        user_tips_result: List[UserTip] = (
            session.query(UserTip)
            .filter(
                UserTip.slot > min_slot_number,
                UserTip.slot <= max_slot_number,
            )
            .all()
        )
        tips = []
        for user_tip in user_tips_result:
            tips.append(
                {
                    const.solana_notification_type: const.solana_notification_type_tip,
                    const.solana_notification_slot: user_tip.slot,
                    const.solana_notification_initiator: user_tip.receiver_user_id,
                    const.solana_notification_metadata: {
                        const.notification_entity_id: user_tip.sender_user_id,
                        const.notification_entity_type: "user",
                        const.solana_notification_tip_amount: to_wei_string(
                            user_tip.amount
                        ),
                        const.solana_notification_tip_signature: user_tip.signature,
                    },
                }
            )

        reaction_results: List[Tuple[Reaction, int]] = (
            session.query(Reaction, User.user_id)
            .join(User, User.wallet == Reaction.sender_wallet)
            .filter(
                Reaction.slot > min_slot_number,
                Reaction.slot <= max_slot_number,
                User.is_current == True,
            )
            .all()
        )

        # Get tips associated with a given reaction
        tip_signatures = [
            e.reacted_to for (e, _) in reaction_results if e.reaction_type == "tip"
        ]
        reaction_tips: List[UserTip] = (
            session.query(UserTip).filter(UserTip.signature.in_(tip_signatures))
        ).all()
        tips_map = {e.signature: e for e in reaction_tips}

        reactions = []
        for (reaction, user_id) in reaction_results:
            tip = tips_map[reaction.reacted_to]
            if not tip:
                continue
            reactions.append(
                {
                    const.solana_notification_type: const.solana_notification_type_reaction,
                    const.solana_notification_slot: reaction.slot,
                    const.notification_initiator: user_id,
                    const.solana_notification_metadata: {
                        const.solana_notification_reaction_type: reaction.reaction_type,
                        const.solana_notification_reaction_reaction_value: reaction.reaction_value,
                        const.solana_notification_reaction_reacted_to_entity: {
                            const.solana_notification_tip_signature: tip.signature,
                            const.solana_notification_tip_amount: to_wei_string(
                                tip.amount
                            ),
                            const.solana_notification_tip_sender_id: tip.sender_user_id,
                        },
                    },
                }
            )
        notifications_unsorted.extend(challenge_reward_notifications)
        notifications_unsorted.extend(digital_content_listen_milestones)
        notifications_unsorted.extend(supporter_rank_ups)
        notifications_unsorted.extend(tips)
        notifications_unsorted.extend(reactions)

    # Final sort
    sorted_notifications = sorted(
        notifications_unsorted,
        key=lambda i: i[const.solana_notification_slot],
        reverse=False,
    )

    return api_helpers.success_response(
        {
            "notifications": sorted_notifications,
            "info": notification_metadata,
        }
    )


@bp.route("/milestones/followers", methods=("GET",))
def milestones_followers():
    db = get_db_read_replica()
    if "user_id" not in request.args:
        return api_helpers.error_response({"msg": "Please provider user ids"}, 500)

    try:
        user_id_str_list = request.args.getlist("user_id")
        user_ids = []
        user_ids = [int(y) for y in user_id_str_list]
    except ValueError as e:
        logger.error("Invalid value found in user id list", esc_info=True)
        return api_helpers.error_response({"msg": e}, 500)

    with db.scoped_session() as session:
        follower_counts = (
            session.query(AggregateUser.user_id, AggregateUser.follower_count)
            .filter(AggregateUser.user_id.in_(user_ids))
            .all()
        )
        follower_count_dict = dict(follower_counts)

    return api_helpers.success_response(follower_count_dict)
