import logging  # pylint: disable=C0302
from datetime import datetime
from typing import Optional, TypedDict, cast

from sqlalchemy import Integer, desc, func
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm.session import Session
from sqlalchemy.sql.functions import GenericFunction
from sqlalchemy.sql.type_api import TypeEngine
from src.api.v1.helpers import (
    extend_content list,
    extend_agreement,
    format_limit,
    format_offset,
    to_dict,
)
from src.models.content lists.aggregate_content list import AggregateContentList
from src.models.content lists.content list import ContentList
from src.models.social.repost import RepostType
from src.models.social.save import Save, SaveType
from src.models.users.aggregate_user import AggregateUser
from src.queries import response_name_constants
from src.queries.get_content list_agreements import get_content list_agreements
from src.queries.get_unpopulated_content lists import get_unpopulated_content lists
from src.queries.query_helpers import (
    add_users_to_agreements,
    get_karma,
    get_repost_counts,
    get_users_by_id,
    get_users_ids,
    populate_content list_metadata,
    populate_agreement_metadata,
)
from src.tasks.generate_trending import time_delta_map
from src.trending_strategies.trending_strategy_factory import DEFAULT_TRENDING_VERSIONS
from src.trending_strategies.trending_type_and_version import (
    TrendingType,
    TrendingVersion,
)
from src.utils.db_session import get_db_read_replica
from src.utils.helpers import decode_string_id
from src.utils.redis_cache import get_trending_cache_key, use_redis_cache


class jsonb_array_length(GenericFunction):  # pylint: disable=too-many-ancestors
    name = "jsonb_array_length"
    type = cast(TypeEngine, Integer)


@compiles(jsonb_array_length, "postgresql")
def compile_jsonb_array_length(element, compiler, **kw):
    return f"{element.name}({compiler.process(element.clauses)})"


logger = logging.getLogger(__name__)

# How many content lists to include
TRENDING_LIMIT = 30

# Cache duration. Faster than trending agreements because
# content lists refresh faster; we can afford to cache this more frequently.
TRENDING_TTL_SEC = 30 * 60

# Max agreements to include in a content list.
CONTENT_LIST_AGREEMENTS_LIMIT = 5


def get_scorable_content list_data(session, time_range, strategy):
    """Gets data about content lists to be scored. Returns:
    Array<{
        "content list_id": number
        "created_at": string
        "owner_id": string
        "windowed_save_count": number
        "save_count": number
        "repost_count: number,
        "windowed_repost_count: number
        "listens": number (always 1)
    }>
    """
    score_params = strategy.get_score_params()
    zq = score_params["zq"]
    xf = score_params["xf"]
    pt = score_params["pt"]
    mt = score_params["mt"]

    delta = time_delta_map.get(time_range) or time_delta_map.get("week")

    # Get all content lists saved within time range (windowed_save_count):
    # Queries by ContentLists Joined with Saves,
    # where a given content list was saved at least once in the past `time_delta`.
    # Limits to `TRENDING_LIMIT` and sorts by saves for later scoring.
    content lists = (
        session.query(
            Save.save_item_id,
            ContentList.created_at,
            ContentList.content list_owner_id,
            func.count(Save.save_item_id),
        )
        .join(ContentList, ContentList.content list_id == Save.save_item_id)
        .join(AggregateUser, AggregateUser.user_id == ContentList.content list_owner_id)
        .filter(
            Save.is_current == True,
            Save.is_delete == False,
            Save.save_type == SaveType.content list,  # Albums are filtered out
            Save.created_at > datetime.now() - delta,
            ContentList.is_current == True,
            ContentList.is_delete == False,
            ContentList.is_private == False,
            jsonb_array_length(ContentList.content list_contents["agreement_ids"]) >= mt,
            AggregateUser.following_count < zq,
        )
        .group_by(Save.save_item_id, ContentList.created_at, ContentList.content list_owner_id)
        .order_by(desc(func.count(Save.save_item_id)))
        .limit(TRENDING_LIMIT)
    ).all()

    # Build up a map of content list data
    # content list_id -> data
    # Some fields initialized at zero
    content list_map = {
        record[0]: {
            response_name_constants.content list_id: record[0],
            response_name_constants.created_at: record[1].isoformat(timespec="seconds"),
            response_name_constants.owner_id: record[2],
            response_name_constants.windowed_save_count: record[3],
            response_name_constants.save_count: 0,
            response_name_constants.repost_count: 0,
            response_name_constants.windowed_repost_count: 0,
            response_name_constants.owner_follower_count: 0,
            "karma": 1,
            "listens": 1,
        }
        for record in content lists
    }

    content list_ids = [record[0] for record in content lists]
    # map owner_id -> [content list_id], accounting for multiple content lists with the same ID
    # used in follows
    content list_owner_id_map = {}
    for (content list_id, _, owner_id, _) in content lists:
        if owner_id not in content list_owner_id_map:
            content list_owner_id_map[owner_id] = [content list_id]
        else:
            content list_owner_id_map[owner_id].append(content list_id)

    # Add repost counts
    repost_counts = (
        session.query(AggregateContentList.content list_id, AggregateContentList.repost_count)
        .filter(AggregateContentList.content list_id.in_(content list_ids))
        .all()
    )
    for (content list_id, repost_count) in repost_counts:
        content list_map[content list_id][response_name_constants.repost_count] = repost_count

    # Add windowed repost counts
    repost_counts_for_time = get_repost_counts(
        session, False, False, content list_ids, [RepostType.content list], None, time_range
    )
    for (content list_id, repost_count) in repost_counts_for_time:
        content list_map[content list_id][
            response_name_constants.windowed_repost_count
        ] = repost_count

    # Add save counts
    save_counts = (
        session.query(AggregateContentList.content list_id, AggregateContentList.save_count)
        .filter(AggregateContentList.content list_id.in_(content list_ids))
        .all()
    )
    for (content list_id, save_count) in save_counts:
        content list_map[content list_id][response_name_constants.save_count] = save_count

    # Add follower counts
    follower_counts = (
        session.query(AggregateUser.user_id, AggregateUser.follower_count)
        .filter(
            AggregateUser.user_id.in_(list(content list_owner_id_map.keys())),
        )
        .all()
    )

    for (followee_user_id, follower_count) in follower_counts:
        if follower_count >= pt:
            owned_content list_ids = content list_owner_id_map[followee_user_id]
            for content list_id in owned_content list_ids:
                content list_map[content list_id][
                    response_name_constants.owner_follower_count
                ] = follower_count

    # Add karma
    karma_scores = get_karma(session, tuple(content list_ids), strategy, None, True, xf)
    for (content list_id, karma) in karma_scores:
        content list_map[content list_id]["karma"] = karma

    return content list_map.values()


def make_get_unpopulated_content lists(session, time_range, strategy):
    """Gets scorable data, scores and sorts, then returns full unpopulated content lists.
    Returns a function, because this is used in a Redis cache hook"""

    def wrapped():
        content list_scoring_data = get_scorable_content list_data(
            session, time_range, strategy
        )

        # score the content lists
        scored_content lists = [
            strategy.get_agreement_score(time_range, content list)
            for content list in content list_scoring_data
        ]
        sorted_content lists = sorted(
            scored_content lists, key=lambda k: k["score"], reverse=True
        )

        # Get the unpopulated content list metadata
        content list_ids = [content list["content list_id"] for content list in sorted_content lists]
        content lists = get_unpopulated_content lists(session, content list_ids)

        content list_agreements_map = get_content list_agreements(session, {"content lists": content lists})

        for content list in content lists:
            content list["agreements"] = content list_agreements_map.get(content list["content list_id"], [])

        results = []
        for content list in content lists:
            # For the BDNxn strategy, filter out content lists with < 3 agreements from other users
            if strategy.version == TrendingVersion.BDNxn:
                content list_owner_id = content list["content list_owner_id"]
                agreement_owner_ids = list(
                    filter(
                        lambda owner_id: owner_id != content list_owner_id,
                        map(lambda agreement: agreement["owner_id"], content list["agreements"]),
                    )
                )
                if len(agreement_owner_ids) < 3:
                    continue
            results.append(content list)

        return (results, list(map(lambda content list: content list["content list_id"], results)))

    return wrapped


def make_trending_cache_key(
    time_range, version=DEFAULT_TRENDING_VERSIONS[TrendingType.CONTENT_LISTS]
):
    version_name = (
        f":{version.name}"
        if version != DEFAULT_TRENDING_VERSIONS[TrendingType.CONTENT_LISTS]
        else ""
    )
    return f"generated-trending-content lists{version_name}:{time_range}"


class GetTrendingContentListsArgs(TypedDict, total=False):
    current_user_id: Optional[int]
    with_agreements: Optional[bool]
    time: str
    offset: int
    limit: int


def _get_trending_content lists_with_session(
    session: Session, args: GetTrendingContentListsArgs, strategy, use_request_context=True
):
    """Returns Trending ContentLists. Checks Redis cache for unpopulated content lists."""
    current_user_id = args.get("current_user_id", None)
    with_agreements = args.get("with_agreements", False)
    time = args.get("time")
    limit, offset = args.get("limit"), args.get("offset")
    key = make_trending_cache_key(time, strategy.version)

    # Get unpopulated content lists,
    # cached if it exists.
    (content lists, content list_ids) = use_redis_cache(
        key, None, make_get_unpopulated_content lists(session, time, strategy)
    )

    # Apply limit + offset early to reduce the amount of
    # population work we have to do
    if limit is not None and offset is not None:
        content lists = content lists[offset : limit + offset]
        content list_ids = content list_ids[offset : limit + offset]

    # Populate content list metadata
    content lists = populate_content list_metadata(
        session,
        content list_ids,
        content lists,
        [RepostType.content list, RepostType.album],
        [SaveType.content list, SaveType.album],
        current_user_id,
    )

    for content list in content lists:
        content list["agreement_count"] = len(content list["agreements"])
        content list["agreements"] = content list["agreements"][:CONTENT_LIST_AGREEMENTS_LIMIT]
        # Trim agreement_ids, which ultimately become added_timestamps
        # and need to match the agreements.
        trimmed_agreement_ids = {agreement["agreement_id"] for agreement in content list["agreements"]}
        content list_agreement_ids = content list["content list_contents"]["agreement_ids"]
        content list_agreement_ids = list(
            filter(
                lambda agreement_id: agreement_id["agreement"]
                in trimmed_agreement_ids,  # pylint: disable=W0640
                content list_agreement_ids,
            )
        )
        content list["content list_contents"]["agreement_ids"] = content list_agreement_ids

    content lists_map = {content list["content list_id"]: content list for content list in content lists}

    if with_agreements:
        # populate agreement metadata
        agreements = []
        for content list in content lists:
            content list_agreements = content list["agreements"]
            agreements.extend(content list_agreements)
        agreement_ids = [agreement["agreement_id"] for agreement in agreements]
        populated_agreements = populate_agreement_metadata(
            session, agreement_ids, agreements, current_user_id
        )

        # Add users if necessary
        add_users_to_agreements(session, populated_agreements, current_user_id)

        # Re-associate agreements with content lists
        # agreement_id -> populated_agreement
        populated_agreement_map = {agreement["agreement_id"]: agreement for agreement in populated_agreements}
        for content list in content lists_map.values():
            for i in range(len(content list["agreements"])):
                agreement_id = content list["agreements"][i]["agreement_id"]
                populated = populated_agreement_map[agreement_id]
                content list["agreements"][i] = populated
            content list["agreements"] = list(map(extend_agreement, content list["agreements"]))

    # re-sort content lists to original order, because populate_content list_metadata
    # unsorts.
    sorted_content lists = [content lists_map[content list_id] for content list_id in content list_ids]

    # Add users to content lists
    user_id_list = get_users_ids(sorted_content lists)
    users = get_users_by_id(session, user_id_list, current_user_id, use_request_context)
    for content list in sorted_content lists:
        user = users[content list["content list_owner_id"]]
        if user:
            content list["user"] = user

    # Extend the content lists
    content lists = list(map(extend_content list, content lists))
    return sorted_content lists


def get_trending_content lists(args: GetTrendingContentListsArgs, strategy):
    """Returns Trending ContentLists. Checks Redis cache for unpopulated content lists."""
    db = get_db_read_replica()
    with db.scoped_session() as session:
        return _get_trending_content lists_with_session(session, args, strategy)


def get_full_trending_content lists(request, args, strategy):
    offset, limit = format_offset(args), format_limit(args, TRENDING_LIMIT)
    current_user_id, time = args.get("user_id"), args.get("time", "week")
    time = "week" if time not in ["week", "month", "year"] else time

    # If we have a user_id, we call into `get_trending_content list`
    # which fetches the cached unpopulated agreements and then
    # populates metadata. Otherwise, just
    # retrieve the last cached value.
    #
    # If current_user_id,
    # apply limit + offset inside the cached calculation.
    # Otherwise, apply it here.
    if current_user_id:
        args = {"time": time, "with_agreements": True, "limit": limit, "offset": offset}
        decoded = decode_string_id(current_user_id)
        args["current_user_id"] = decoded
        content lists = get_trending_content lists(args, strategy)
    else:
        args = {
            "time": time,
            "with_agreements": True,
        }
        key = get_trending_cache_key(to_dict(request.args), request.path)
        content lists = use_redis_cache(
            key, TRENDING_TTL_SEC, lambda: get_trending_content lists(args, strategy)
        )
        content lists = content lists[offset : limit + offset]

    return content lists
