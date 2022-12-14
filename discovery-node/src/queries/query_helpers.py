# pylint: disable=too-many-lines
import logging
from typing import Tuple

from flask import request
from sqlalchemy import Integer, and_, bindparam, cast, desc, func, text
from sqlalchemy.orm.session import Session
from sqlalchemy.sql.expression import or_
from src import exceptions
from src.models.content_lists.aggregate_content_list import AggregateContentList
from src.models.content_lists.content_list import ContentList
from src.models.social.aggregate_plays import AggregatePlay
from src.models.social.follow import Follow
from src.models.social.repost import Repost, RepostType
from src.models.social.save import Save, SaveType
from src.models.digitalContents.aggregate_digital_content import AggregateDigitalContent
from src.models.digitalContents.remix import Remix
from src.models.digitalContents.digital_content import DigitalContent
from src.models.users.aggregate_user import AggregateUser
from src.models.users.user import User
from src.models.users.user_bank import UserBankAccount
from src.queries import response_name_constants
from src.queries.get_balances import get_balances
from src.queries.get_unpopulated_users import get_unpopulated_users, set_users_in_cache
from src.trending_strategies.trending_type_and_version import TrendingVersion
from src.utils import helpers, redis_connection

logger = logging.getLogger(__name__)

redis = redis_connection.get_redis()


# ####### VARS ####### #


defaultLimit = 100
minLimit = 1
maxLimit = 500
defaultOffset = 0
minOffset = 0

# Used when generating genre list to special case Electronic tunes
electronic_sub_genres = [
    "Techno",
    "Trap",
    "House",
    "Tech House",
    "Deep House",
    "Disco",
    "Electro",
    "Jungle",
    "Progressive House",
    "Hardstyle",
    "Glitch Hop",
    "Trance",
    "Future Bass",
    "Future House",
    "Tropical House",
    "Downtempo",
    "Drum & Bass",
    "Dubstep",
    "Jersey Club",
]

# ####### HELPERS ####### #


def get_current_user_id(required=True):
    user_id_header = "X-User-ID"
    uid = request.headers.get(user_id_header)
    try:
        if uid:
            uid = int(uid)
    except ValueError as e:
        raise exceptions.ArgumentError("must be valid integer") from e
    if required and not uid:
        raise exceptions.ArgumentError("Need to include valid X-User-ID header")

    return uid


def parse_sort_param(base_query, model, whitelist_sort_params):
    sort = request.args.get("sort")
    if not sort:
        return base_query

    params = sort.split(",")
    try:
        params = {param[0]: param[1] for param in [p.split(":") for p in params]}
    except IndexError as e:
        raise exceptions.ArgumentError(
            "Need to specify :asc or :desc on all parameters"
        ) from e
    order_bys = []
    for field in params.keys():
        if field not in whitelist_sort_params:
            raise exceptions.ArgumentError(f"Parameter {field} is invalid in sort")
        attr = getattr(model, field)
        if params[field] == "desc":
            attr = attr.desc()
        else:
            attr = attr.asc()
        order_bys.append(attr)

    return base_query.order_by(*order_bys)


# given list of user ids and corresponding users, populates each user object with:
#   digital_content_count, content_list_count, album_count, follower_count, followee_count, repost_count, supporter_count, supporting_count
#   if current_user_id available, populates does_current_user_follow, followee_follows
def populate_user_metadata(
    session, user_ids, users, current_user_id, with_digital_content_save_count=False
):
    aggregate_user = (
        session.query(
            AggregateUser.user_id,
            AggregateUser.digital_content_count,
            AggregateUser.content_list_count,
            AggregateUser.album_count,
            AggregateUser.follower_count,
            AggregateUser.following_count,
            AggregateUser.repost_count,
            AggregateUser.digital_content_save_count,
            AggregateUser.supporter_count,
            AggregateUser.supporting_count,
        )
        .filter(AggregateUser.user_id.in_(user_ids))
        .all()
    )

    # build a dict of user (eth) wallet -> user bank
    user_banks = session.query(
        UserBankAccount.ethereum_address, UserBankAccount.bank_account
    ).filter(UserBankAccount.ethereum_address.in_(user["wallet"] for user in users))
    user_banks_dict = dict(user_banks)

    # build dict of user id --> digital_content/contentList/album/follower/followee/repost/digital_content save/supporting/supporter counts
    count_dict = {
        user_id: {
            response_name_constants.digital_content_count: digital_content_count,
            response_name_constants.content_list_count: content_list_count,
            response_name_constants.album_count: album_count,
            response_name_constants.follower_count: follower_count,
            response_name_constants.followee_count: following_count,
            response_name_constants.repost_count: repost_count,
            response_name_constants.digital_content_save_count: digital_content_save_count,
            response_name_constants.supporter_count: supporter_count,
            response_name_constants.supporting_count: supporting_count,
        }
        for (
            user_id,
            digital_content_count,
            content_list_count,
            album_count,
            follower_count,
            following_count,
            repost_count,
            digital_content_save_count,
            supporter_count,
            supporting_count,
        ) in aggregate_user
    }

    # build dict of user id --> digital_content blocknumber
    digital_content_blocknumbers = (
        session.query(DigitalContent.owner_id, func.max(DigitalContent.blocknumber))
        .filter(
            DigitalContent.is_current == True,
            DigitalContent.is_delete == False,
            DigitalContent.owner_id.in_(user_ids),
        )
        .group_by(DigitalContent.owner_id)
        .all()
    )
    digital_content_blocknumber_dict = dict(digital_content_blocknumbers)

    follows_current_user_set = set()
    current_user_followed_user_ids = {}
    current_user_followee_follow_count_dict = {}
    if current_user_id:
        # collect all incoming and outgoing follow edges for current user.
        current_user_follow_rows = (
            session.query(Follow.follower_user_id, Follow.followee_user_id)
            .filter(
                Follow.is_current == True,
                Follow.is_delete == False,
                or_(
                    and_(
                        Follow.followee_user_id.in_(user_ids),
                        Follow.follower_user_id == current_user_id,
                    ),
                    and_(
                        Follow.followee_user_id == current_user_id,
                        Follow.follower_user_id.in_(user_ids),
                    ),
                ),
            )
            .all()
        )
        for follower_id, following_id in current_user_follow_rows:
            if follower_id == current_user_id:
                current_user_followed_user_ids[following_id] = True
            else:
                follows_current_user_set.add(follower_id)

        # build dict of user id --> followee follow count
        current_user_followees = (
            session.query(Follow.followee_user_id)
            .filter(
                Follow.is_current == True,
                Follow.is_delete == False,
                Follow.follower_user_id == current_user_id,
            )
            .subquery()
        )

        current_user_followee_follow_counts = (
            session.query(Follow.followee_user_id, func.count(Follow.followee_user_id))
            .filter(
                Follow.is_current == True,
                Follow.is_delete == False,
                Follow.follower_user_id.in_(current_user_followees),
                Follow.followee_user_id.in_(user_ids),
            )
            .group_by(Follow.followee_user_id)
            .all()
        )
        current_user_followee_follow_count_dict = dict(
            current_user_followee_follow_counts
        )

    balance_dict = get_balances(session, redis, user_ids)

    for user in users:
        user_id = user["user_id"]
        user_balance = balance_dict.get(user_id, {})
        user[response_name_constants.digital_content_count] = count_dict.get(user_id, {}).get(
            response_name_constants.digital_content_count, 0
        )
        user[response_name_constants.content_list_count] = count_dict.get(user_id, {}).get(
            response_name_constants.content_list_count, 0
        )
        user[response_name_constants.album_count] = count_dict.get(user_id, {}).get(
            response_name_constants.album_count, 0
        )
        user[response_name_constants.follower_count] = count_dict.get(user_id, {}).get(
            response_name_constants.follower_count, 0
        )
        user[response_name_constants.followee_count] = count_dict.get(user_id, {}).get(
            response_name_constants.followee_count, 0
        )
        user[response_name_constants.repost_count] = count_dict.get(user_id, {}).get(
            response_name_constants.repost_count, 0
        )
        user[response_name_constants.digital_content_blocknumber] = digital_content_blocknumber_dict.get(
            user_id, -1
        )
        if with_digital_content_save_count:
            user[response_name_constants.digital_content_save_count] = count_dict.get(
                user_id, {}
            ).get(response_name_constants.digital_content_save_count, 0)
        user[response_name_constants.supporter_count] = count_dict.get(user_id, {}).get(
            response_name_constants.supporter_count, 0
        )
        user[response_name_constants.supporting_count] = count_dict.get(
            user_id, {}
        ).get(response_name_constants.supporting_count, 0)
        # current user specific
        user[
            response_name_constants.does_current_user_follow
        ] = current_user_followed_user_ids.get(user_id, False)
        user[
            response_name_constants.current_user_followee_follow_count
        ] = current_user_followee_follow_count_dict.get(user_id, 0)
        user[response_name_constants.balance] = user_balance.get(
            "owner_wallet_balance", "0"
        )
        user[response_name_constants.total_balance] = user_balance.get(
            "total_balance", "0"
        )
        user[response_name_constants.associated_wallets_balance] = user_balance.get(
            "associated_wallets_balance", "0"
        )
        user[response_name_constants.associated_sol_wallets_balance] = user_balance.get(
            "associated_sol_wallets_balance", "0"
        )
        user[response_name_constants.wei_digitalcoin_balance] = user_balance.get(
            "wei_digitalcoin_balance", "0"
        )
        user[response_name_constants.spl_wallet] = user_banks_dict.get(
            user["wallet"], None
        )
        user[response_name_constants.does_follow_current_user] = (
            user_id in follows_current_user_set
        )

    return users


def get_digital_content_play_count_dict(session, digital_content_ids):
    if not digital_content_ids:
        return {}
    query = text(
        """
        select play_item_id, count
        from aggregate_plays
        where play_item_id in :ids
        """
    )
    query = query.bindparams(bindparam("ids", expanding=True))

    digital_content_play_counts = session.execute(query, {"ids": digital_content_ids}).fetchall()
    digital_content_play_dict = dict(digital_content_play_counts)
    return digital_content_play_dict


# given list of digital_content ids and corresponding digitalContents, populates each digital_content object with:
#   repost_count, save_count
#   if remix: remix users, has_remix_author_reposted, has_remix_author_saved
#   if current_user_id available, populates followee_reposts, has_current_user_reposted, has_current_user_saved
def populate_digital_content_metadata(session, digital_content_ids, digitalContents, current_user_id):
    # build dict of digital_content id --> repost count
    counts = (
        session.query(
            AggregateDigitalContent.digital_content_id,
            AggregateDigitalContent.repost_count,
            AggregateDigitalContent.save_count,
        )
        .filter(
            AggregateDigitalContent.digital_content_id.in_(digital_content_ids),
        )
        .all()
    )

    count_dict = {
        digital_content_id: {
            response_name_constants.repost_count: repost_count,
            response_name_constants.save_count: save_count,
        }
        for (digital_content_id, repost_count, save_count) in counts
    }

    play_count_dict = get_digital_content_play_count_dict(session, digital_content_ids)

    remixes = get_digital_content_remix_metadata(session, digitalContents, current_user_id)

    user_reposted_digital_content_dict = {}
    user_saved_digital_content_dict = {}
    followee_digital_content_repost_dict = {}
    followee_digital_content_save_dict = {}
    if current_user_id:
        # has current user reposted any of requested digital_content ids
        user_reposted = (
            session.query(Repost.repost_item_id)
            .filter(
                Repost.is_current == True,
                Repost.is_delete == False,
                Repost.repost_item_id.in_(digital_content_ids),
                Repost.repost_type == RepostType.digital_content,
                Repost.user_id == current_user_id,
            )
            .all()
        )
        user_reposted_digital_content_dict = {repost[0]: True for repost in user_reposted}

        # has current user saved any of requested digital_content ids
        user_saved_digital_contents_query = (
            session.query(Save.save_item_id)
            .filter(
                Save.is_current == True,
                Save.is_delete == False,
                Save.user_id == current_user_id,
                Save.save_item_id.in_(digital_content_ids),
                Save.save_type == SaveType.digital_content,
            )
            .all()
        )
        user_saved_digital_content_dict = {save[0]: True for save in user_saved_digital_contents_query}

        # Get current user's followees.
        followees = session.query(Follow.followee_user_id).filter(
            Follow.follower_user_id == current_user_id,
            Follow.is_current == True,
            Follow.is_delete == False,
        )

        # build dict of digital_content id --> followee reposts
        followee_digital_content_reposts = session.query(Repost).filter(
            Repost.is_current == True,
            Repost.is_delete == False,
            Repost.repost_item_id.in_(digital_content_ids),
            Repost.repost_type == RepostType.digital_content,
            Repost.user_id.in_(followees),
        )
        followee_digital_content_reposts = helpers.query_result_to_list(followee_digital_content_reposts)
        for digital_content_repost in followee_digital_content_reposts:
            if digital_content_repost["repost_item_id"] not in followee_digital_content_repost_dict:
                followee_digital_content_repost_dict[digital_content_repost["repost_item_id"]] = []
            followee_digital_content_repost_dict[digital_content_repost["repost_item_id"]].append(
                digital_content_repost
            )

        # Build dict of digital_content id --> followee saves.
        followee_digital_content_saves = session.query(Save).filter(
            Save.is_current == True,
            Save.is_delete == False,
            Save.save_item_id.in_(digital_content_ids),
            Save.save_type == SaveType.digital_content,
            Save.user_id.in_(followees),
        )
        followee_digital_content_saves = helpers.query_result_to_list(followee_digital_content_saves)
        for digital_content_save in followee_digital_content_saves:
            if digital_content_save["save_item_id"] not in followee_digital_content_save_dict:
                followee_digital_content_save_dict[digital_content_save["save_item_id"]] = []
            followee_digital_content_save_dict[digital_content_save["save_item_id"]].append(digital_content_save)

    for digital_content in digitalContents:
        digital_content_id = digital_content["digital_content_id"]
        digital_content[response_name_constants.repost_count] = count_dict.get(digital_content_id, {}).get(
            response_name_constants.repost_count, 0
        )
        digital_content[response_name_constants.save_count] = count_dict.get(digital_content_id, {}).get(
            response_name_constants.save_count, 0
        )
        digital_content[response_name_constants.play_count] = play_count_dict.get(digital_content_id, 0)
        # current user specific
        digital_content[
            response_name_constants.followee_reposts
        ] = followee_digital_content_repost_dict.get(digital_content_id, [])
        digital_content[response_name_constants.followee_saves] = followee_digital_content_save_dict.get(
            digital_content_id, []
        )
        digital_content[
            response_name_constants.has_current_user_reposted
        ] = user_reposted_digital_content_dict.get(digital_content_id, False)
        digital_content[
            response_name_constants.has_current_user_saved
        ] = user_saved_digital_content_dict.get(digital_content["digital_content_id"], False)

        # Populate the remix_of digitalContents w/ the parent digital_content's user and if that user saved/reposted the child
        if (
            response_name_constants.remix_of in digital_content
            and isinstance(digital_content[response_name_constants.remix_of], dict)
            and digital_content["digital_content_id"] in remixes
        ):
            remix_digital_contents = digital_content[response_name_constants.remix_of].get("digitalContents")
            if remix_digital_contents and isinstance(remix_digital_contents, list):
                for remix_digital_content in remix_digital_contents:
                    parent_digital_content_id = remix_digital_content.get("parent_digital_content_id")
                    if parent_digital_content_id in remixes[digital_content["digital_content_id"]]:
                        remix_digital_content.update(remixes[digital_content["digital_content_id"]][parent_digital_content_id])
        else:
            digital_content[response_name_constants.remix_of] = None

    return digitalContents


def get_digital_content_remix_metadata(session, digitalContents, current_user_id):
    """
    Fetches digitalContents' remix parent owners and if they have saved/reposted the digitalContents

    Args:
        session: (DB) The scoped db session for running db queries
        digitalContents: (List<DigitalContent>) The digitalContents table objects to fetch remix parent user's information for
        current_user_id?: (int) Requesting user's id for adding additional metadata to the fetched users

    Returns:
        remixes: (dict) Mapping of child digital_content ids to parent digital_content ids to parent digital_content user's metadata
        {
            [childDigitalContentId] : {
                [parentDigitalContentId]: {
                    has_remix_author_saved: boolean,
                    has_remix_author_reposted: boolean,
                    user: populated user metadata
                }
            }
        }
    """
    digital_content_ids_with_remix = []
    remix_query = []
    for digital_content in digitalContents:
        if response_name_constants.remix_of in digital_content:
            digital_content_ids_with_remix.append(digital_content["digital_content_id"])

    if digital_content_ids_with_remix:
        # Fetch the remix parent digital_content's user and if that user has saved/favorited the child digital_content
        remix_query = (
            session.query(
                DigitalContent.owner_id.label("digital_content_owner_id"),
                Remix.parent_digital_content_id.label("parent_digital_content_id"),
                Remix.child_digital_content_id.label("child_digital_content_id"),
                Save.is_current.label("has_remix_author_saved"),
                Repost.is_current.label("has_remix_author_reposted"),
                User,
            )
            .join(
                Remix,
                and_(
                    Remix.parent_digital_content_id == DigitalContent.digital_content_id,
                    Remix.child_digital_content_id.in_(digital_content_ids_with_remix),
                ),
            )
            .join(User, and_(User.user_id == DigitalContent.owner_id, User.is_current == True))
            .outerjoin(
                Save,
                and_(
                    Save.save_item_id == Remix.child_digital_content_id,
                    Save.save_type == SaveType.digital_content,
                    Save.is_current == True,
                    Save.is_delete == False,
                    Save.user_id == DigitalContent.owner_id,
                ),
            )
            .outerjoin(
                Repost,
                and_(
                    Repost.repost_item_id == Remix.child_digital_content_id,
                    Repost.user_id == DigitalContent.owner_id,
                    Repost.repost_type == RepostType.digital_content,
                    Repost.is_current == True,
                    Repost.is_delete == False,
                ),
            )
            .filter(DigitalContent.is_current == True, DigitalContent.is_unlisted == False)
            .all()
        )

    remixes = {}
    remix_parent_owners = {}
    populated_users = {}

    # Build a dict of user id -> user model obj of the remixed digital_content's parent owner to dedupe users
    for remix_relationship in remix_query:
        [digital_content_owner_id, _, _, _, _, user] = remix_relationship
        if digital_content_owner_id not in remix_parent_owners:
            remix_parent_owners[digital_content_owner_id] = user

    # populate the user's metadata for the remixed digital_content's parent owner
    # build `populated_users` as a map of userId -> json user
    if remix_parent_owners:
        [remix_parent_owner_ids, remix_parent_owners] = list(
            zip(
                *[
                    [k, remix_parent_owner]
                    for k, remix_parent_owner in remix_parent_owners.items()
                ]
            )
        )
        remix_parent_owners = helpers.query_result_to_list(list(remix_parent_owners))
        populated_remix_parent_users = populate_user_metadata(
            session, list(remix_parent_owner_ids), remix_parent_owners, current_user_id
        )
        for user in populated_remix_parent_users:
            populated_users[user["user_id"]] = user

    # Build a dict of child digital_content id => parent digital_content id => { user, has_remix_author_saved, has_remix_author_reposted }
    for remix_relationship in remix_query:
        [
            digital_content_owner_id,
            parent_digital_content_id,
            child_digital_content_id,
            has_remix_author_saved,
            has_remix_author_reposted,
            _,
        ] = remix_relationship
        if child_digital_content_id not in remixes:
            remixes[child_digital_content_id] = {
                parent_digital_content_id: {
                    response_name_constants.has_remix_author_saved: bool(
                        has_remix_author_saved
                    ),
                    response_name_constants.has_remix_author_reposted: bool(
                        has_remix_author_reposted
                    ),
                    "user": populated_users[digital_content_owner_id],
                }
            }
        else:
            remixes[child_digital_content_id][parent_digital_content_id] = {
                response_name_constants.has_remix_author_saved: bool(
                    has_remix_author_saved
                ),
                response_name_constants.has_remix_author_reposted: bool(
                    has_remix_author_reposted
                ),
                "user": populated_users[digital_content_owner_id],
            }

    return remixes


# given list of contentList ids and corresponding contentLists, populates each contentList object with:
#   repost_count, save_count
#   if current_user_id available, populates followee_reposts, has_current_user_reposted, has_current_user_saved


def populate_content_list_metadata(
    session, content_list_ids, contentLists, repost_types, save_types, current_user_id
):
    # build dict of contentList id --> repost & save count
    counts = (
        session.query(
            AggregateContentList.content_list_id,
            AggregateContentList.repost_count,
            AggregateContentList.save_count,
        )
        .filter(
            AggregateContentList.content_list_id.in_(content_list_ids),
        )
        .all()
    )

    count_dict = {
        content_list_id: {
            response_name_constants.repost_count: repost_count,
            response_name_constants.save_count: save_count,
        }
        for (content_list_id, repost_count, save_count) in counts
    }

    user_reposted_content_list_dict = {}
    user_saved_content_list_dict = {}
    followee_content_list_repost_dict = {}
    followee_content_list_save_dict = {}
    if current_user_id:
        # has current user reposted any of requested contentList ids
        current_user_content_list_reposts = (
            session.query(Repost.repost_item_id)
            .filter(
                Repost.is_current == True,
                Repost.is_delete == False,
                Repost.repost_item_id.in_(content_list_ids),
                Repost.repost_type.in_(repost_types),
                Repost.user_id == current_user_id,
            )
            .all()
        )
        user_reposted_content_list_dict = {
            r[0]: True for r in current_user_content_list_reposts
        }

        # has current user saved any of requested contentList ids
        user_saved_content_lists_query = (
            session.query(Save.save_item_id)
            .filter(
                Save.is_current == True,
                Save.is_delete == False,
                Save.user_id == current_user_id,
                Save.save_item_id.in_(content_list_ids),
                Save.save_type.in_(save_types),
            )
            .all()
        )
        user_saved_content_list_dict = {
            save[0]: True for save in user_saved_content_lists_query
        }

        # Get current user's followees.
        followee_user_ids = (
            session.query(Follow.followee_user_id)
            .filter(
                Follow.follower_user_id == current_user_id,
                Follow.is_current == True,
                Follow.is_delete == False,
            )
            .all()
        )

        # Build dict of contentList id --> followee reposts.
        followee_content_list_reposts = (
            session.query(Repost)
            .filter(
                Repost.is_current == True,
                Repost.is_delete == False,
                Repost.repost_item_id.in_(content_list_ids),
                Repost.repost_type.in_(repost_types),
                Repost.user_id.in_(followee_user_ids),
            )
            .all()
        )
        followee_content_list_reposts = helpers.query_result_to_list(
            followee_content_list_reposts
        )
        for content_list_repost in followee_content_list_reposts:
            if content_list_repost["repost_item_id"] not in followee_content_list_repost_dict:
                followee_content_list_repost_dict[content_list_repost["repost_item_id"]] = []
            followee_content_list_repost_dict[content_list_repost["repost_item_id"]].append(
                content_list_repost
            )

        # Build dict of contentList id --> followee saves.
        followee_content_list_saves = (
            session.query(Save)
            .filter(
                Save.is_current == True,
                Save.is_delete == False,
                Save.save_item_id.in_(content_list_ids),
                Save.save_type.in_(save_types),
                Save.user_id.in_(followee_user_ids),
            )
            .all()
        )
        followee_content_list_saves = helpers.query_result_to_list(followee_content_list_saves)
        for content_list_save in followee_content_list_saves:
            if content_list_save["save_item_id"] not in followee_content_list_save_dict:
                followee_content_list_save_dict[content_list_save["save_item_id"]] = []
            followee_content_list_save_dict[content_list_save["save_item_id"]].append(
                content_list_save
            )

    digital_content_ids = []
    for contentList in contentLists:
        for digital_content in contentList["content_list_contents"]["digital_content_ids"]:
            digital_content_ids.append(digital_content["digital_content"])
    play_count_dict = get_digital_content_play_count_dict(session, digital_content_ids)

    for contentList in contentLists:
        content_list_id = contentList["content_list_id"]
        contentList[response_name_constants.repost_count] = count_dict.get(
            content_list_id, {}
        ).get(response_name_constants.repost_count, 0)
        contentList[response_name_constants.save_count] = count_dict.get(
            content_list_id, {}
        ).get(response_name_constants.save_count, 0)

        total_play_count = 0
        for digital_content in contentList["content_list_contents"]["digital_content_ids"]:
            total_play_count += play_count_dict.get(digital_content["digital_content"], 0)
        contentList[response_name_constants.total_play_count] = total_play_count

        # current user specific
        contentList[
            response_name_constants.followee_reposts
        ] = followee_content_list_repost_dict.get(content_list_id, [])
        contentList[
            response_name_constants.followee_saves
        ] = followee_content_list_save_dict.get(content_list_id, [])
        contentList[
            response_name_constants.has_current_user_reposted
        ] = user_reposted_content_list_dict.get(content_list_id, False)
        contentList[
            response_name_constants.has_current_user_saved
        ] = user_saved_content_list_dict.get(content_list_id, False)

    return contentLists


def get_repost_counts_query(
    session,
    query_by_user_flag,
    query_repost_type_flag,
    filter_ids,
    repost_types,
    max_block_number=None,
):
    query_col = Repost.user_id if query_by_user_flag else Repost.repost_item_id

    repost_counts_query = None
    if query_repost_type_flag:
        repost_counts_query = session.query(
            query_col, func.count(query_col), Repost.repost_type
        )
    else:
        repost_counts_query = session.query(
            query_col,
            func.count(query_col),
        )

    repost_counts_query = repost_counts_query.filter(
        Repost.is_current == True, Repost.is_delete == False
    )

    if filter_ids is not None:
        repost_counts_query = repost_counts_query.filter(query_col.in_(filter_ids))
    if repost_types:
        repost_counts_query = repost_counts_query.filter(
            Repost.repost_type.in_(repost_types)
        )

    if query_repost_type_flag:
        repost_counts_query = repost_counts_query.group_by(
            query_col, Repost.repost_type
        )
    else:
        repost_counts_query = repost_counts_query.group_by(query_col)

    if max_block_number:
        repost_counts_query = repost_counts_query.filter(
            Repost.blocknumber <= max_block_number
        )

    return repost_counts_query


# Gets the repost count for users or digitalContents with the filters specified in the params.
# The time param {day, week, month, year} is used in generate_trending to create a windowed time frame for repost counts


def get_repost_counts(
    session,
    query_by_user_flag,
    query_repost_type_flag,
    filter_ids,
    repost_types,
    max_block_number=None,
    time=None,
):
    repost_counts_query = get_repost_counts_query(
        session,
        query_by_user_flag,
        query_repost_type_flag,
        filter_ids,
        repost_types,
        max_block_number,
    )

    if time is not None:
        interval = f"NOW() - interval '1 {time}'"
        repost_counts_query = repost_counts_query.filter(
            Repost.created_at >= text(interval)
        )
    return repost_counts_query.all()


def get_karma(
    session: Session,
    ids: Tuple[int],
    strategy: TrendingVersion,
    time: str = None,
    is_content_list: bool = False,
    xf: bool = False,
):
    """Gets the total karma for provided ids (digital_content or contentList)"""

    repost_type = RepostType.contentList if is_content_list else RepostType.digital_content
    save_type = SaveType.contentList if is_content_list else SaveType.digital_content

    reposters = session.query(
        Repost.user_id.label("user_id"), Repost.repost_item_id.label("item_id")
    ).filter(
        Repost.repost_item_id.in_(ids),
        Repost.is_delete == False,
        Repost.is_current == True,
        Repost.repost_type == repost_type,
    )

    savers = session.query(
        Save.user_id.label("user_id"), Save.save_item_id.label("item_id")
    ).filter(
        Save.save_item_id.in_(ids),
        Save.is_current == True,
        Save.is_delete == False,
        Save.save_type == save_type,
    )
    if time is not None:
        interval = f"NOW() - interval '1 {time}'"
        savers = savers.filter(Save.created_at >= text(interval))
        reposters = reposters.filter(Repost.created_at >= text(interval))

    saves_and_reposts = reposters.union_all(savers).subquery()
    if xf:
        saves_and_reposts = (
            session.query(
                saves_and_reposts.c.user_id.label("user_id"),
                saves_and_reposts.c.item_id.label("item_id"),
            )
            .select_from(saves_and_reposts)
            .join(User, saves_and_reposts.c.user_id == User.user_id)
        )
        saves_and_reposts = saves_and_reposts.filter(
            or_(User.cover_photo != None, User.cover_photo_sizes != None),
            or_(User.profile_picture != None, User.profile_picture_sizes != None),
            User.bio != None,
        )
        saves_and_reposts = saves_and_reposts.subquery()

    query = (
        session.query(
            saves_and_reposts.c.item_id,
            cast(func.sum(AggregateUser.follower_count), Integer),
        )
        .select_from(saves_and_reposts)
        .join(AggregateUser, saves_and_reposts.c.user_id == AggregateUser.user_id)
        .group_by(saves_and_reposts.c.item_id)
    )

    return query.all()


def get_save_counts_query(
    session,
    query_by_user_flag,
    query_save_type_flag,
    filter_ids,
    save_types,
    max_block_number=None,
):
    query_col = Save.user_id if query_by_user_flag else Save.save_item_id

    save_counts_query = None
    if query_save_type_flag:
        save_counts_query = session.query(
            query_col, func.count(query_col), Save.save_type
        )
    else:
        save_counts_query = session.query(
            query_col,
            func.count(query_col),
        )

    save_counts_query = save_counts_query.filter(
        Save.is_current == True, Save.is_delete == False
    )

    if filter_ids is not None:
        save_counts_query = save_counts_query.filter(Save.save_item_id.in_(filter_ids))
    if save_types:
        save_counts_query = save_counts_query.filter(Save.save_type.in_(save_types))

    if query_save_type_flag:
        save_counts_query = save_counts_query.group_by(query_col, Save.save_type)
    else:
        save_counts_query = save_counts_query.group_by(query_col)

    if max_block_number:
        save_counts_query = save_counts_query.filter(
            Save.blocknumber <= max_block_number
        )

    return save_counts_query


# Gets the save count for users or digitalContents with the filters specified in the params.
# The time param {day, week, month, year} is used in generate_trending to create a windowed time frame for save counts
def get_save_counts(
    session,
    query_by_user_flag,
    query_save_type_flag,
    filter_ids,
    save_types,
    max_block_number=None,
    time=None,
):
    save_counts_query = get_save_counts_query(
        session,
        query_by_user_flag,
        query_save_type_flag,
        filter_ids,
        save_types,
        max_block_number,
    )

    if time is not None:
        interval = f"NOW() - interval '1 {time}'"
        save_counts_query = save_counts_query.filter(Save.created_at >= text(interval))
    return save_counts_query.all()


def get_follower_count_dict(session, user_ids, max_block_number=None):
    follower_counts = session.query(
        Follow.followee_user_id, func.count(Follow.followee_user_id)
    ).filter(
        Follow.is_current == True,
        Follow.is_delete == False,
        Follow.followee_user_id.in_(user_ids),
    )

    if max_block_number:
        follower_counts = follower_counts.filter(Follow.blocknumber <= max_block_number)

    follower_counts = follower_counts.group_by(Follow.followee_user_id).all()

    follower_count_dict = dict(follower_counts)
    return follower_count_dict


def get_digital_content_play_counts(db, digital_content_ids):
    """Gets the digital_content play counts for the given digital_content_ids
    Args:
        db: sqlalchemy db session instance
        digital_content_ids: list of digital_content ids

    Returns:
        dict of digital_content id keys to digital_content play count values
    """

    digital_content_listen_counts = {}

    if not digital_content_ids:
        return digital_content_listen_counts

    digital_content_plays = (
        db.query(AggregatePlay).filter(AggregatePlay.play_item_id.in_(digital_content_ids)).all()
    )

    for digital_content_play in digital_content_plays:
        digital_content_listen_counts[digital_content_play.play_item_id] = digital_content_play.count

    for digital_content_id in digital_content_ids:
        if digital_content_id not in digital_content_listen_counts:
            digital_content_listen_counts[digital_content_id] = 0

    return digital_content_listen_counts


def get_sum_aggregate_plays(db):
    """Gets the sum of all aggregate plays
    Args:
        db: sqlalchemy db session instance

    Returns:
        int of total play count
    """

    plays = db.query(func.sum(AggregatePlay.count)).scalar()

    return int(plays)


def get_pagination_vars():
    limit = min(
        max(request.args.get("limit", default=defaultLimit, type=int), minLimit),
        maxLimit,
    )
    offset = max(request.args.get("offset", default=defaultOffset, type=int), minOffset)
    return (limit, offset)


def paginate_query(query_obj, apply_offset=True, include_count=False):
    (limit, offset) = get_pagination_vars()
    modified_query = query_obj.limit(limit)
    modified_query = modified_query.offset(offset) if apply_offset else modified_query
    if include_count:
        return (modified_query, query_obj.count())
    return modified_query


def add_query_pagination(
    query_obj, limit, offset, apply_offset=True, include_count=False
):
    modified_query = query_obj.limit(limit)
    modified_query = modified_query.offset(offset) if apply_offset else modified_query
    if include_count:
        return (modified_query, query_obj.count())
    return modified_query


def get_genre_list(genre):
    genre_list = []
    genre_list.append(genre)
    if genre == "Electronic":
        genre_list = genre_list + electronic_sub_genres
    return genre_list


def get_users_by_id(session, user_ids, current_user_id=None, use_request_context=True):
    users = get_unpopulated_users(session, user_ids)

    if not current_user_id and use_request_context:
        current_user_id = get_current_user_id(required=False)
    # bundle peripheral info into user results
    populated_users = populate_user_metadata(session, user_ids, users, current_user_id)
    user_map = {}
    for user in populated_users:
        user_map[user["user_id"]] = user

    return user_map


# Given an array of digitalContents and/or contentLists, return an array of unique user ids


def get_users_ids(results):
    user_ids = []
    for result in results:
        if "content_list_owner_id" in result:
            user_ids.append(int(result["content_list_owner_id"]))
        elif "owner_id" in result:
            user_ids.append(int(result["owner_id"]))
    # Remove duplicate user ids
    user_ids = list(set(user_ids))
    return user_ids


def create_followee_content_lists_subquery(session, current_user_id):
    """
    Creates a subquery that returns contentLists created by users that
    `current_user_id` follows.

    Args:
        session: SQLAlchemy session.
        current_user_id: The current user id to query against
    """
    # Get active followees
    followee_user_ids_subquery = (
        session.query(Follow.followee_user_id)
        .filter(
            Follow.follower_user_id == current_user_id,
            Follow.is_current == True,
            Follow.is_delete == False,
        )
        .subquery()
    )
    followee_content_lists_subquery = (
        session.query(ContentList)
        .select_from(ContentList)
        .join(
            followee_user_ids_subquery,
            ContentList.content_list_owner_id == followee_user_ids_subquery.c.followee_user_id,
        )
        .subquery()
    )
    return followee_content_lists_subquery


def seconds_ago(timestamp):
    """Gets the number of seconds ago `timestamp` was from now as a SqlAlchemy expression."""
    return func.extract("epoch", (func.now() - timestamp))


def decayed_score(score, created_at, peak=1000, nominal_timestamp=60 * 24 * 60 * 60):
    """
    Creates a decaying (over time) version of the provided `score`. The returned
    value is score * a multiplier determined by `peak` and `nominal_timestamp`.

    Args:
        score: (number) The base score to modify
        created_at: (timestamp) The timestamp the score is attributed to
        peak?: (number) The peak multipler possible

    Returns:
        A SQLAlchemy expression representing decayed score (score * multipler)
        where multipler is represented by:
        peak ^ 1 - min(time_ago / nominal_timestamp, 1)
    """
    decay_exponent = 1 - func.least(
        seconds_ago(created_at) / nominal_timestamp, 1
    )  # goes from 1 -> 0
    decay_value = func.pow(peak, decay_exponent) / peak  # decay slope value
    return score * decay_value


def filter_to_content_list_mood(session, mood, query, correlation):
    """
    Takes a session that is querying for contentLists and filters the contentLists
    to only those with the dominant mood provided.
    Dominant mood means that *most* of its digitalContents are of the specified mood.

    This method takes a query inserts a filter clause on it and returns the same query.
    We filter down those contentLists to dominant mood by running an "exists" clause
    on a dominant mood subquery.

    Args:
        session: SQLALchemy session.
        mood: (string) The mood to query against.
        query: The base query to filter on
        correlation: An optional correlation / subquery to correlate against.

    Returns: A modified version of `query` with an extra filter clause.
    """
    if not mood:
        return query

    digitalContents_subquery = session.query(
        func.jsonb_array_elements(correlation.c.content_list_contents["digital_content_ids"])
        .op("->>")("digital_content")
        .cast(Integer)
    )

    if correlation is not None:
        # If this query runs against a nested subquery, it might need to
        # be manually correlated to that subquery so it doesn't pull in all
        # contentLists here.
        digitalContents_subquery = digitalContents_subquery.correlate(correlation)

    # Query for the most common mood in a contentList
    dominant_mood_subquery = (
        session.query(
            DigitalContent.mood.label("mood"),
            func.max(DigitalContent.digital_content_id).label("latest"),
            func.count(DigitalContent.mood).label("cnt"),
        )
        .filter(
            DigitalContent.is_current == True,
            DigitalContent.is_delete == False,
            DigitalContent.digital_content_id.in_(digitalContents_subquery),
        )
        .group_by(DigitalContent.mood)
        .order_by(desc("cnt"), desc("latest"))
        .limit(1)
        .subquery()
    )

    # Match the provided mood against the dominant mood for contentLists
    mood_exists_query = session.query(dominant_mood_subquery.c.mood).filter(
        func.lower(dominant_mood_subquery.c.mood) == func.lower(mood)
    )

    # Filter contentList query to those that have the most common mood checking that
    # there `exists` such a contentList with the dominant mood
    return query.filter(mood_exists_query.exists())


def add_users_to_digital_contents(session, digitalContents, current_user_id=None):
    """
    Fetches the owners for the digitalContents and adds them to the digital_content dict under the key 'user'

    Args:
        session: (DB) sqlalchemy scoped db session
        digitalContents: (Array<digital_content dict>) Array of digitalContents dict

    Side Effects:
        Modifies the digital_content dictionaries to add a nested owner user

    Returns: None
    """
    user_ids = get_users_ids(digitalContents)
    users = []
    if digitalContents and len(digitalContents) > 0 and digitalContents[0].get("user"):
        users = list(map(lambda t: t["user"][0], digitalContents))
    else:
        # This shouldn't happen - all digitalContents should come preloaded with their owners per the relationship
        users = get_unpopulated_users(session, user_ids)
        logger.warning("add_users_to_digital_contents() called but digitalContents have no users")
    set_users_in_cache(users)
    # bundle peripheral info into user results
    populated_users = populate_user_metadata(session, user_ids, users, current_user_id)
    user_map = {}
    for user in populated_users:
        user_map[user["user_id"]] = user

    for digital_content in digitalContents:
        user = user_map[digital_content["owner_id"]]
        if user:
            digital_content["user"] = user
