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
from src.models.contentLists.contentList import ContentList
from src.models.rewards.challenge_disbursement import ChallengeDisbursement
from src.models.social.follow import Follow
from src.models.social.reaction import Reaction
from src.models.social.repost import Repost, RepostType
from src.models.social.save import Save, SaveType
from src.models.agreements.remix import Remix
from src.models.agreements.agreement import Agreement
from src.models.users.aggregate_user import AggregateUser
from src.models.users.supporter_rank_up import SupporterRankUp
from src.models.users.user import User
from src.models.users.user_balance_change import UserBalanceChange
from src.models.users.user_tip import UserTip
from src.queries import response_name_constants as const
from src.queries.get_prev_agreement_entries import get_prev_agreement_entries
from src.utils import web3_provider
from src.utils.config import shared_config
from src.utils.db_session import get_db_read_replica
from src.utils.redis_connection import get_redis
from src.utils.redis_constants import (
    latest_sol_aggregate_tips_slot_key,
    latest_sol_plays_slot_key,
    latest_sol_rewards_manager_slot_key,
)
from src.utils.spl_live import to_wei_string

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
        entity_type: (string) Must be either 'agreement' | 'album' | 'contentList
        entity_id: (int) The id of the 'entity_type'

    Returns:
        owner_id: (int | None) The user id of the owner of the entity_type/entity_id
    """
    if entity_type == "agreement":
        owner_id_query = (
            session.query(Agreement.owner_id)
            .filter(
                Agreement.agreement_id == entity_id,
                Agreement.is_delete == False,
                Agreement.is_current == True,
            )
            .all()
        )
        if not owner_id_query:
            return None
        owner_id = owner_id_query[0][0]
        return owner_id

    if entity_type == "album":
        owner_id_query = (
            session.query(ContentList.contentList_owner_id)
            .filter(
                ContentList.contentList_id == entity_id,
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

    if entity_type == "contentList":
        owner_id_query = (
            session.query(ContentList.contentList_owner_id)
            .filter(
                ContentList.contentList_id == entity_id,
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


def get_cosign_remix_notifications(session, max_block_number, remix_agreements):
    """
    Get the notifications for remix agreements that are reposted/favorited by the parent remix author

    Args:
        session: (DB)
        max_block_number: (int)
        remix_agreements: (Array<{ }>)
            'user_id'
            'item_id'
            const.notification_blocknumber
            const.notification_timestamp
            'item_owner_id'

    Returns:
        Array of cosign notifications

    """
    if not remix_agreements:
        return []

    remix_notifications = []
    remix_agreement_ids = [r["item_id"] for r in remix_agreements]

    # Query for all the parent agreements of the remix agreements
    agreements_subquery = (
        session.query(Agreement)
        .filter(
            Agreement.is_unlisted == False,
            Agreement.is_delete == False,
            Agreement.is_current == True,
        )
        .subquery()
    )

    parent_agreements = (
        session.query(
            Remix.child_agreement_id, Remix.parent_agreement_id, agreements_subquery.c.owner_id
        )
        .join(agreements_subquery, Remix.parent_agreement_id == agreements_subquery.c.agreement_id)
        .filter(Remix.child_agreement_id.in_(remix_agreement_ids))
        .all()
    )
    # Mapping of parent agreement users to child agreement to parent agreement
    parent_agreement_users_to_remixes = {}
    for agreement_parent in parent_agreements:
        [remix_agreement_id, remix_parent_id, remix_parent_user_id] = agreement_parent
        if remix_parent_user_id not in parent_agreement_users_to_remixes:
            parent_agreement_users_to_remixes[remix_parent_user_id] = {
                remix_agreement_id: remix_parent_id
            }
        else:
            parent_agreement_users_to_remixes[remix_parent_user_id][
                remix_agreement_id
            ] = remix_parent_id

    for remix_agreement in remix_agreements:
        user_id = remix_agreement["user_id"]
        agreement_id = remix_agreement["item_id"]

        if (
            user_id in parent_agreement_users_to_remixes
            and agreement_id in parent_agreement_users_to_remixes[user_id]
        ):
            remix_notifications.append(
                {
                    const.notification_type: const.notification_type_remix_cosign,
                    const.notification_blocknumber: remix_agreement[
                        const.notification_blocknumber
                    ],
                    const.notification_timestamp: remix_agreement[
                        const.notification_timestamp
                    ],
                    const.notification_initiator: user_id,
                    const.notification_metadata: {
                        const.notification_entity_id: agreement_id,
                        const.notification_entity_type: "agreement",
                        const.notification_entity_owner_id: remix_agreement[
                            "item_owner_id"
                        ],
                    },
                }
            )

    return remix_notifications


class GroupMilestones(TypedDict):
    agreements: Dict[int, int]
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

    milestone_contentList_ids = [
        contentList_id
        for name, contentList_id, _ in milestones_in_block
        if name
        in (
            MilestoneName.CONTENT_LIST_REPOST_COUNT,
            MilestoneName.CONTENT_LIST_SAVE_COUNT,
        )
    ]

    contentList_id_albums: Dict[int, bool] = {}
    if milestone_contentList_ids:
        contentList_id_albums_response = (
            session.query(ContentList.contentList_id, ContentList.is_album)
            .filter(
                ContentList.is_current == True,
                ContentList.contentList_id.in_(milestone_contentList_ids),
            )
            .all()
        )
        contentList_id_albums = dict(contentList_id_albums_response)

    album_favorites: List[Tuple[int, int]] = []
    contentList_favorites: List[Tuple[int, int]] = []
    for id, threshold in milestones.get(MilestoneName.CONTENT_LIST_SAVE_COUNT, []):
        if id in contentList_id_albums and contentList_id_albums[id]:
            album_favorites.append((id, threshold))
        else:
            contentList_favorites.append((id, threshold))

    album_reposts: List[Tuple[int, int]] = []
    contentList_reposts: List[Tuple[int, int]] = []
    for id, threshold in milestones.get(MilestoneName.CONTENT_LIST_REPOST_COUNT, []):
        if id in contentList_id_albums and contentList_id_albums[id]:
            album_reposts.append((id, threshold))
        else:
            contentList_reposts.append((id, threshold))

    favorite_milestones: GroupMilestones = {
        "agreements": dict(milestones.get(MilestoneName.AGREEMENT_SAVE_COUNT, [])),
        "albums": dict(album_favorites),
        "contentLists": dict(contentList_favorites),
    }

    repost_milestones: GroupMilestones = {
        "agreements": dict(milestones.get(MilestoneName.AGREEMENT_REPOST_COUNT, [])),
        "albums": dict(album_reposts),
        "contentLists": dict(contentList_reposts),
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
        agreement_id?: (Array<int>) Array of agreement id for fetching the agreement's owner id
            and adding the agreement id to owner user id mapping to the `owners` response field
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
                contentList_update_timestamp?: (string) timestamp of last update of a given contentList
                contentList_update_users?: (array<int>) user ids which favorited a given contentList

        info: Dictionary of metadata w/ min_block_number & max_block_number fields

        milestones: Dictionary mapping of follows/reposts/favorites (processed within the blocks params)
            Root fields:
                follower_counts: Contains a dictionary of user id => follower count (up to the max_block_number)
                repost_counts: Contains a dictionary agreements/albums/contentLists of id to repost count
                favorite_counts: Contains a dictionary agreements/albums/contentLists of id to favorite count

        owners: Dictionary containing the mapping for agreement id / contentList id / album -> owner user id
            The root keys are 'agreements', 'contentLists', 'albums' and each contains the id to owner id mapping
    """

    db = get_db_read_replica()
    web3 = web3_provider.get_web3()
    min_block_number = request.args.get("min_block_number", type=int)
    max_block_number = request.args.get("max_block_number", type=int)

    agreement_ids_to_owner = []
    try:
        agreement_ids_str_list = request.args.getlist("agreement_id")
        agreement_ids_to_owner = [int(y) for y in agreement_ids_str_list]
    except Exception as e:
        logger.error(f"Failed to retrieve agreement list {e}")

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
    owner_info = {const.agreements: {}, const.albums: {}, const.contentLists: {}}

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
        favorited_agreement_ids = []
        favorited_album_ids = []
        favorited_contentList_ids = []

        # List of favorite notifications
        favorite_notifications = []
        favorite_remix_agreements = []

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
            if save_type == SaveType.agreement:
                owner_id = get_owner_id(session, "agreement", save_item_id)
                if not owner_id:
                    continue
                metadata[const.notification_entity_owner_id] = owner_id
                favorited_agreement_ids.append(save_item_id)
                owner_info[const.agreements][save_item_id] = owner_id

                favorite_remix_agreements.append(
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
                owner_id = get_owner_id(session, "contentList", save_item_id)
                if not owner_id:
                    continue
                metadata[const.notification_entity_owner_id] = owner_id
                favorited_contentList_ids.append(save_item_id)
                owner_info[const.contentLists][save_item_id] = owner_id

            favorite_notif[const.notification_metadata] = metadata
            favorite_notifications.append(favorite_notif)
        notifications_unsorted.extend(favorite_notifications)

        if favorited_agreement_ids:
            favorite_remix_notifications = get_cosign_remix_notifications(
                session, max_block_number, favorite_remix_agreements
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
        reposted_agreement_ids = []
        reposted_album_ids = []
        reposted_contentList_ids = []

        # List of repost notifications
        repost_notifications = []

        # List of repost notifications
        repost_remix_notifications = []
        repost_remix_agreements = []

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
            if repost_type == RepostType.agreement:
                owner_id = get_owner_id(session, "agreement", repost_item_id)
                if not owner_id:
                    continue
                metadata[const.notification_entity_owner_id] = owner_id
                reposted_agreement_ids.append(repost_item_id)
                owner_info[const.agreements][repost_item_id] = owner_id
                repost_remix_agreements.append(
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
                owner_id = get_owner_id(session, "contentList", repost_item_id)
                if not owner_id:
                    continue
                metadata[const.notification_entity_owner_id] = owner_id
                reposted_contentList_ids.append(repost_item_id)
                owner_info[const.contentLists][repost_item_id] = owner_id

            repost_notif[const.notification_metadata] = metadata
            repost_notifications.append(repost_notif)

        # Append repost notifications
        notifications_unsorted.extend(repost_notifications)

        # Aggregate repost counts for relevant fields
        # Used to notify users of entity-specific milestones
        if reposted_agreement_ids:
            repost_remix_notifications = get_cosign_remix_notifications(
                session, max_block_number, repost_remix_agreements
            )
            notifications_unsorted.extend(repost_remix_notifications)

        # Query relevant created entity notification - agreements/albums/contentLists
        created_notifications = []

        logger.info(f"notifications.py | reposts at {datetime.now() - start_time}")

        #
        # Query relevant created agreements for remix information
        #
        remix_created_notifications = []

        # Aggregate agreement notifs
        agreements_query = session.query(Agreement)
        # TODO: Is it valid to use Agreement.is_current here? Might not be the right info...
        agreements_query = agreements_query.filter(
            Agreement.is_unlisted == False,
            Agreement.is_delete == False,
            Agreement.stem_of == None,
            Agreement.blocknumber > min_block_number,
            Agreement.blocknumber <= max_block_number,
        )
        agreements_query = agreements_query.filter(Agreement.created_at == Agreement.updated_at)
        agreement_results = agreements_query.all()
        for entry in agreement_results:
            agreement_notif = {
                const.notification_type: const.notification_type_create,
                const.notification_blocknumber: entry.blocknumber,
                const.notification_timestamp: entry.created_at,
                const.notification_initiator: entry.owner_id,
                # TODO: is entity owner id necessary for agreements?
                const.notification_metadata: {
                    const.notification_entity_type: "agreement",
                    const.notification_entity_id: entry.agreement_id,
                    const.notification_entity_owner_id: entry.owner_id,
                },
            }
            created_notifications.append(agreement_notif)

            if entry.remix_of:
                # Add notification to remix agreement owner
                parent_remix_agreements = [
                    t["parent_agreement_id"] for t in entry.remix_of["agreements"]
                ]
                remix_agreement_parents = (
                    session.query(Agreement.owner_id, Agreement.agreement_id)
                    .filter(
                        Agreement.agreement_id.in_(parent_remix_agreements),
                        Agreement.is_unlisted == False,
                        Agreement.is_delete == False,
                        Agreement.is_current == True,
                    )
                    .all()
                )
                for remix_agreement_parent in remix_agreement_parents:
                    [
                        remix_agreement_parent_owner,
                        remix_agreement_parent_id,
                    ] = remix_agreement_parent
                    remix_notif = {
                        const.notification_type: const.notification_type_remix_create,
                        const.notification_blocknumber: entry.blocknumber,
                        const.notification_timestamp: entry.created_at,
                        const.notification_initiator: entry.owner_id,
                        # TODO: is entity owner id necessary for agreements?
                        const.notification_metadata: {
                            const.notification_entity_type: "agreement",
                            const.notification_entity_id: entry.agreement_id,
                            const.notification_entity_owner_id: entry.owner_id,
                            const.notification_remix_parent_agreement_user_id: remix_agreement_parent_owner,
                            const.notification_remix_parent_agreement_id: remix_agreement_parent_id,
                        },
                    }
                    remix_created_notifications.append(remix_notif)

        logger.info(f"notifications.py | remixes at {datetime.now() - start_time}")

        # Handle agreement update notifications
        # TODO: Consider switching blocknumber for updated at?
        updated_agreements_query = session.query(Agreement)
        updated_agreements_query = updated_agreements_query.filter(
            Agreement.is_unlisted == False,
            Agreement.stem_of == None,
            Agreement.created_at != Agreement.updated_at,
            Agreement.blocknumber > min_block_number,
            Agreement.blocknumber <= max_block_number,
        )
        updated_agreements = updated_agreements_query.all()

        prev_agreements = get_prev_agreement_entries(session, updated_agreements)

        for prev_entry in prev_agreements:
            entry = next(t for t in updated_agreements if t.agreement_id == prev_entry.agreement_id)
            logger.info(
                f"notifications.py | single agreement update {entry.agreement_id} {entry.blocknumber} {datetime.now() - start_time}"
            )

            # Agreements that were unlisted and turned to public
            if prev_entry.is_unlisted == True:
                logger.info(
                    f"notifications.py | single agreement update to public {datetime.now() - start_time}"
                )
                agreement_notif = {
                    const.notification_type: const.notification_type_create,
                    const.notification_blocknumber: entry.blocknumber,
                    const.notification_timestamp: entry.created_at,
                    const.notification_initiator: entry.owner_id,
                    # TODO: is entity owner id necessary for agreements?
                    const.notification_metadata: {
                        const.notification_entity_type: "agreement",
                        const.notification_entity_id: entry.agreement_id,
                        const.notification_entity_owner_id: entry.owner_id,
                    },
                }
                created_notifications.append(agreement_notif)

            # Agreements that were not remixes and turned into remixes
            if not prev_entry.remix_of and entry.remix_of:
                # Add notification to remix agreement owner
                parent_remix_agreements = [
                    t["parent_agreement_id"] for t in entry.remix_of["agreements"]
                ]
                remix_agreement_parents = (
                    session.query(Agreement.owner_id, Agreement.agreement_id)
                    .filter(
                        Agreement.agreement_id.in_(parent_remix_agreements),
                        Agreement.is_unlisted == False,
                        Agreement.is_delete == False,
                        Agreement.is_current == True,
                    )
                    .all()
                )
                logger.info(
                    f"notifications.py | single agreement update parents {remix_agreement_parents} {datetime.now() - start_time}"
                )
                for remix_agreement_parent in remix_agreement_parents:
                    [
                        remix_agreement_parent_owner,
                        remix_agreement_parent_id,
                    ] = remix_agreement_parent
                    remix_notif = {
                        const.notification_type: const.notification_type_remix_create,
                        const.notification_blocknumber: entry.blocknumber,
                        const.notification_timestamp: entry.created_at,
                        const.notification_initiator: entry.owner_id,
                        # TODO: is entity owner id necessary for agreements?
                        const.notification_metadata: {
                            const.notification_entity_type: "agreement",
                            const.notification_entity_id: entry.agreement_id,
                            const.notification_entity_owner_id: entry.owner_id,
                            const.notification_remix_parent_agreement_user_id: remix_agreement_parent_owner,
                            const.notification_remix_parent_agreement_id: remix_agreement_parent_id,
                        },
                    }
                    remix_created_notifications.append(remix_notif)

        notifications_unsorted.extend(remix_created_notifications)

        logger.info(
            f"notifications.py | agreement updates at {datetime.now() - start_time}"
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
                const.notification_initiator: entry.contentList_owner_id,
            }
            metadata = {
                const.notification_entity_id: entry.contentList_id,
                const.notification_entity_owner_id: entry.contentList_owner_id,
                const.notification_collection_content: entry.contentList_contents,
            }

            if entry.is_album:
                metadata[const.notification_entity_type] = "album"
            else:
                metadata[const.notification_entity_type] = "contentList"
            collection_notif[const.notification_metadata] = metadata
            created_notifications.append(collection_notif)

        # ContentLists that were private and turned to public aka 'published'
        # TODO: Consider switching blocknumber for updated at?
        publish_contentLists_query = session.query(ContentList)
        publish_contentLists_query = publish_contentLists_query.filter(
            ContentList.is_private == False,
            ContentList.created_at != ContentList.updated_at,
            ContentList.blocknumber > min_block_number,
            ContentList.blocknumber <= max_block_number,
        )
        publish_contentList_results = publish_contentLists_query.all()
        for entry in publish_contentList_results:
            prev_entry_query = (
                session.query(ContentList)
                .filter(
                    ContentList.contentList_id == entry.contentList_id,
                    ContentList.blocknumber < entry.blocknumber,
                )
                .order_by(desc(ContentList.blocknumber))
            )
            # Previous private entry indicates transition to public, triggering a notification
            prev_entry = prev_entry_query.first()
            if prev_entry.is_private == True:
                publish_contentList_notif = {
                    const.notification_type: const.notification_type_create,
                    const.notification_blocknumber: entry.blocknumber,
                    const.notification_timestamp: entry.created_at,
                    const.notification_initiator: entry.contentList_owner_id,
                }
                metadata = {
                    const.notification_entity_id: entry.contentList_id,
                    const.notification_entity_owner_id: entry.contentList_owner_id,
                    const.notification_collection_content: entry.contentList_contents,
                    const.notification_entity_type: "contentList",
                }
                publish_contentList_notif[const.notification_metadata] = metadata
                created_notifications.append(publish_contentList_notif)

        # ContentLists that had agreements added to them
        # Get all contentLists that were modified over this range
        contentList_agreement_added_query = session.query(ContentList).filter(
            ContentList.is_current == True,
            ContentList.is_delete == False,
            ContentList.is_private == False,
            ContentList.blocknumber > min_block_number,
            ContentList.blocknumber <= max_block_number,
        )
        contentList_agreement_added_results = contentList_agreement_added_query.all()
        # Loop over all contentList updates and determine if there were agreements added
        # at the block that the contentList update is at
        agreement_added_to_contentList_notifications = []
        agreement_ids = []
        for entry in contentList_agreement_added_results:
            # Get the agreement_ids from entry["contentList_contents"]
            if not entry.contentList_contents["agreement_ids"]:
                # skip empty contentLists
                continue
            contentList_contents = entry.contentList_contents
            min_block = web3.eth.get_block(min_block_number)
            max_block = web3.eth.get_block(max_block_number)

            for agreement in contentList_contents["agreement_ids"]:
                agreement_id = agreement["agreement"]
                agreement_timestamp = agreement["time"]
                # We know that this agreement was added to the contentList at this specific update
                if (
                    min_block.timestamp < agreement_timestamp
                    and agreement_timestamp <= max_block.timestamp
                ):
                    agreement_ids.append(agreement_id)
                    agreement_added_to_contentList_notification = {
                        const.notification_type: const.notification_type_add_agreement_to_contentList,
                        const.notification_blocknumber: entry.blocknumber,
                        const.notification_timestamp: entry.created_at,
                        const.notification_initiator: entry.contentList_owner_id,
                    }
                    metadata = {
                        const.contentList_id: entry.contentList_id,
                        const.agreement_id: agreement_id,
                    }
                    agreement_added_to_contentList_notification[
                        const.notification_metadata
                    ] = metadata
                    agreement_added_to_contentList_notifications.append(
                        agreement_added_to_contentList_notification
                    )

        agreements = (
            session.query(Agreement.owner_id, Agreement.agreement_id)
            .filter(
                Agreement.agreement_id.in_(agreement_ids),
                Agreement.is_unlisted == False,
                Agreement.is_delete == False,
                Agreement.is_current == True,
            )
            .all()
        )
        agreement_owner_map = {}
        for agreement in agreements:
            owner_id, agreement_id = agreement
            agreement_owner_map[agreement_id] = owner_id

        # Loop over notifications and populate their metadata
        for notification in agreement_added_to_contentList_notifications:
            agreement_id = notification[const.notification_metadata][const.agreement_id]
            if agreement_id not in agreement_owner_map:
                # Note: if agreement_id not in agreement_owner_map, it's because the agreement is either deleted, unlisted, or doesn't exist
                # In that case, it should not trigger a notification
                continue
            else:
                agreement_owner_id = agreement_owner_map[agreement_id]
                if agreement_owner_id != notification[const.notification_initiator]:
                    # add agreements that don't belong to the contentList owner
                    notification[const.notification_metadata][
                        const.agreement_owner_id
                    ] = agreement_owner_id
                    created_notifications.append(notification)

        notifications_unsorted.extend(created_notifications)

        logger.info(f"notifications.py | contentLists at {datetime.now() - start_time}")

        # Get additional owner info as requested for listen counts
        agreements_owner_query = session.query(Agreement).filter(
            Agreement.is_current == True, Agreement.agreement_id.in_(agreement_ids_to_owner)
        )
        agreement_owner_results = agreements_owner_query.all()
        for entry in agreement_owner_results:
            owner = entry.owner_id
            agreement_id = entry.agreement_id
            owner_info[const.agreements][agreement_id] = owner

        logger.info(
            f"notifications.py | owner info at {datetime.now() - start_time}, owners {len(agreement_owner_results)}"
        )

        # Get contentList updates
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)
        thirty_days_ago_time = datetime(
            thirty_days_ago.year, thirty_days_ago.month, thirty_days_ago.day, 0, 0, 0
        )
        contentList_update_query = session.query(ContentList)
        contentList_update_query = contentList_update_query.filter(
            ContentList.is_current == True,
            ContentList.is_delete == False,
            ContentList.last_added_to >= thirty_days_ago_time,
            ContentList.blocknumber > min_block_number,
            ContentList.blocknumber <= max_block_number,
        )

        contentList_update_results = contentList_update_query.all()

        logger.info(
            f"notifications.py | get contentList updates at {datetime.now() - start_time}, contentList updates {len(contentList_update_results)}"
        )

        # Represents all contentList update notifications
        contentList_update_notifications = []
        contentList_update_notifs_by_contentList_id = {}
        for entry in contentList_update_results:
            contentList_update_notifs_by_contentList_id[entry.contentList_id] = {
                const.notification_type: const.notification_type_contentList_update,
                const.notification_blocknumber: entry.blocknumber,
                const.notification_timestamp: entry.created_at,
                const.notification_initiator: entry.contentList_owner_id,
                const.notification_metadata: {
                    const.notification_entity_id: entry.contentList_id,
                    const.notification_entity_type: "contentList",
                    const.notification_contentList_update_timestamp: entry.last_added_to,
                },
            }

        # get all favorited contentLists
        # contentLists may have been favorited outside the blocknumber bounds
        # e.g. before the min_block_number
        contentList_favorites_query = session.query(Save)
        contentList_favorites_query = contentList_favorites_query.filter(
            Save.is_current == True,
            Save.is_delete == False,
            Save.save_type == SaveType.contentList,
            Save.save_item_id.in_(contentList_update_notifs_by_contentList_id.keys()),
        )
        contentList_favorites_results = contentList_favorites_query.all()

        logger.info(
            f"notifications.py | get contentList favorites {datetime.now() - start_time}, contentList favorites {len(contentList_favorites_results)}"
        )

        # dictionary of contentList id => users that favorited said contentList
        # e.g. { contentList1: [user1, user2, ...], ... }
        # we need this dictionary to know which users need to be notified of a contentList update
        users_that_favorited_contentLists_dict = {}
        for result in contentList_favorites_results:
            if result.save_item_id in users_that_favorited_contentLists_dict:
                users_that_favorited_contentLists_dict[result.save_item_id].append(
                    result.user_id
                )
            else:
                users_that_favorited_contentLists_dict[result.save_item_id] = [
                    result.user_id
                ]

        logger.info(
            f"notifications.py | computed users that favorited dict {datetime.now() - start_time}"
        )

        for contentList_id in users_that_favorited_contentLists_dict:
            # TODO: We probably do not need this check because we are filtering
            # contentList_favorites_query to only matching ids
            if contentList_id not in contentList_update_notifs_by_contentList_id:
                continue
            contentList_update_notif = contentList_update_notifs_by_contentList_id[contentList_id]
            contentList_update_notif[const.notification_metadata].update(
                {
                    const.notification_contentList_update_users: users_that_favorited_contentLists_dict[
                        contentList_id
                    ]
                }
            )
            contentList_update_notifications.append(contentList_update_notif)

        notifications_unsorted.extend(contentList_update_notifications)

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

        agreement_listen_milestone: List[Tuple(Milestone, int)] = (
            session.query(Milestone, Agreement.owner_id)
            .filter(
                Milestone.name == MilestoneName.LISTEN_COUNT,
                Milestone.slot > min_slot_number,
                Milestone.slot <= max_slot_number,
            )
            .join(Agreement, Agreement.agreement_id == Milestone.id and Agreement.is_current == True)
            .all()
        )

        agreement_listen_milestones = []
        for result in agreement_listen_milestone:
            agreement_milestone, agreement_owner_id = result
            agreement_listen_milestones.append(
                {
                    const.solana_notification_type: const.solana_notification_type_listen_milestone,
                    const.solana_notification_slot: agreement_milestone.slot,
                    const.solana_notification_initiator: agreement_owner_id,  # owner_id
                    const.solana_notification_metadata: {
                        const.solana_notification_threshold: agreement_milestone.threshold,
                        const.notification_entity_id: agreement_milestone.id,  # agreement_id
                        const.notification_entity_type: "agreement",
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
        notifications_unsorted.extend(agreement_listen_milestones)
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
