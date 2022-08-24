import logging  # pylint: disable=C0302
from datetime import datetime
from typing import Optional, TypedDict, cast

from sqlalchemy import Integer, desc, func
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm.session import Session
from sqlalchemy.sql.functions import GenericFunction
from sqlalchemy.sql.type_api import TypeEngine
from src.api.v1.helpers import (
    extend_content_list,
    extend_agreement,
    format_limit,
    format_offset,
    to_dict,
)
from src.models.content_lists.aggregate_content_list import AggregateContentList
from src.models.content_lists.content_list import ContentList
from src.models.social.repost import RepostType
from src.models.social.save import Save, SaveType
from src.models.users.aggregate_user import AggregateUser
from src.queries import response_name_constants
from src.queries.get_content_list_agreements import get_content_list_agreements
from src.queries.get_unpopulated_content_lists import get_unpopulated_content_lists
from src.queries.query_helpers import (
    add_users_to_agreements,
    get_karma,
    get_repost_counts,
    get_users_by_id,
    get_users_ids,
    populate_content_list_metadata,
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

# How many contentLists to include
TRENDING_LIMIT = 30

# Cache duration. Faster than trending agreements because
# contentLists refresh faster; we can afford to cache this more frequently.
TRENDING_TTL_SEC = 30 * 60

# Max agreements to include in a contentList.
CONTENT_LIST_AGREEMENTS_LIMIT = 5


def get_scorable_content_list_data(session, time_range, strategy):
    """Gets data about contentLists to be scored. Returns:
    Array<{
        "content_list_id": number
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

    # Get all contentLists saved within time range (windowed_save_count):
    # Queries by ContentLists Joined with Saves,
    # where a given contentList was saved at least once in the past `time_delta`.
    # Limits to `TRENDING_LIMIT` and sorts by saves for later scoring.
    contentLists = (
        session.query(
            Save.save_item_id,
            ContentList.created_at,
            ContentList.content_list_owner_id,
            func.count(Save.save_item_id),
        )
        .join(ContentList, ContentList.content_list_id == Save.save_item_id)
        .join(AggregateUser, AggregateUser.user_id == ContentList.content_list_owner_id)
        .filter(
            Save.is_current == True,
            Save.is_delete == False,
            Save.save_type == SaveType.contentList,  # Albums are filtered out
            Save.created_at > datetime.now() - delta,
            ContentList.is_current == True,
            ContentList.is_delete == False,
            ContentList.is_private == False,
            jsonb_array_length(ContentList.content_list_contents["agreement_ids"]) >= mt,
            AggregateUser.following_count < zq,
        )
        .group_by(Save.save_item_id, ContentList.created_at, ContentList.content_list_owner_id)
        .order_by(desc(func.count(Save.save_item_id)))
        .limit(TRENDING_LIMIT)
    ).all()

    # Build up a map of contentList data
    # content_list_id -> data
    # Some fields initialized at zero
    content_list_map = {
        record[0]: {
            response_name_constants.content_list_id: record[0],
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
        for record in contentLists
    }

    content_list_ids = [record[0] for record in contentLists]
    # map owner_id -> [content_list_id], accounting for multiple contentLists with the same ID
    # used in follows
    content_list_owner_id_map = {}
    for (content_list_id, _, owner_id, _) in contentLists:
        if owner_id not in content_list_owner_id_map:
            content_list_owner_id_map[owner_id] = [content_list_id]
        else:
            content_list_owner_id_map[owner_id].append(content_list_id)

    # Add repost counts
    repost_counts = (
        session.query(AggregateContentList.content_list_id, AggregateContentList.repost_count)
        .filter(AggregateContentList.content_list_id.in_(content_list_ids))
        .all()
    )
    for (content_list_id, repost_count) in repost_counts:
        content_list_map[content_list_id][response_name_constants.repost_count] = repost_count

    # Add windowed repost counts
    repost_counts_for_time = get_repost_counts(
        session, False, False, content_list_ids, [RepostType.contentList], None, time_range
    )
    for (content_list_id, repost_count) in repost_counts_for_time:
        content_list_map[content_list_id][
            response_name_constants.windowed_repost_count
        ] = repost_count

    # Add save counts
    save_counts = (
        session.query(AggregateContentList.content_list_id, AggregateContentList.save_count)
        .filter(AggregateContentList.content_list_id.in_(content_list_ids))
        .all()
    )
    for (content_list_id, save_count) in save_counts:
        content_list_map[content_list_id][response_name_constants.save_count] = save_count

    # Add follower counts
    follower_counts = (
        session.query(AggregateUser.user_id, AggregateUser.follower_count)
        .filter(
            AggregateUser.user_id.in_(list(content_list_owner_id_map.keys())),
        )
        .all()
    )

    for (followee_user_id, follower_count) in follower_counts:
        if follower_count >= pt:
            owned_content_list_ids = content_list_owner_id_map[followee_user_id]
            for content_list_id in owned_content_list_ids:
                content_list_map[content_list_id][
                    response_name_constants.owner_follower_count
                ] = follower_count

    # Add karma
    karma_scores = get_karma(session, tuple(content_list_ids), strategy, None, True, xf)
    for (content_list_id, karma) in karma_scores:
        content_list_map[content_list_id]["karma"] = karma

    return content_list_map.values()


def make_get_unpopulated_content_lists(session, time_range, strategy):
    """Gets scorable data, scores and sorts, then returns full unpopulated contentLists.
    Returns a function, because this is used in a Redis cache hook"""

    def wrapped():
        content_list_scoring_data = get_scorable_content_list_data(
            session, time_range, strategy
        )

        # score the contentLists
        scored_content_lists = [
            strategy.get_agreement_score(time_range, contentList)
            for contentList in content_list_scoring_data
        ]
        sorted_content_lists = sorted(
            scored_content_lists, key=lambda k: k["score"], reverse=True
        )

        # Get the unpopulated contentList metadata
        content_list_ids = [contentList["content_list_id"] for contentList in sorted_content_lists]
        contentLists = get_unpopulated_content_lists(session, content_list_ids)

        content_list_agreements_map = get_content_list_agreements(session, {"content_lists": contentLists})

        for contentList in contentLists:
            contentList["agreements"] = content_list_agreements_map.get(contentList["content_list_id"], [])

        results = []
        for contentList in contentLists:
            # For the BDNxn strategy, filter out contentLists with < 3 agreements from other users
            if strategy.version == TrendingVersion.BDNxn:
                content_list_owner_id = contentList["content_list_owner_id"]
                agreement_owner_ids = list(
                    filter(
                        lambda owner_id: owner_id != content_list_owner_id,
                        map(lambda agreement: agreement["owner_id"], contentList["agreements"]),
                    )
                )
                if len(agreement_owner_ids) < 3:
                    continue
            results.append(contentList)

        return (results, list(map(lambda contentList: contentList["content_list_id"], results)))

    return wrapped


def make_trending_cache_key(
    time_range, version=DEFAULT_TRENDING_VERSIONS[TrendingType.CONTENT_LISTS]
):
    version_name = (
        f":{version.name}"
        if version != DEFAULT_TRENDING_VERSIONS[TrendingType.CONTENT_LISTS]
        else ""
    )
    return f"generated-trending-content-lists{version_name}:{time_range}"


class GetTrendingContentListsArgs(TypedDict, total=False):
    current_user_id: Optional[int]
    with_agreements: Optional[bool]
    time: str
    offset: int
    limit: int


def _get_trending_content_lists_with_session(
    session: Session, args: GetTrendingContentListsArgs, strategy, use_request_context=True
):
    """Returns Trending ContentLists. Checks Redis cache for unpopulated contentLists."""
    current_user_id = args.get("current_user_id", None)
    with_agreements = args.get("with_agreements", False)
    time = args.get("time")
    limit, offset = args.get("limit"), args.get("offset")
    key = make_trending_cache_key(time, strategy.version)

    # Get unpopulated contentLists,
    # cached if it exists.
    (contentLists, content_list_ids) = use_redis_cache(
        key, None, make_get_unpopulated_content_lists(session, time, strategy)
    )

    # Apply limit + offset early to reduce the amount of
    # population work we have to do
    if limit is not None and offset is not None:
        contentLists = contentLists[offset : limit + offset]
        content_list_ids = content_list_ids[offset : limit + offset]

    # Populate contentList metadata
    contentLists = populate_content_list_metadata(
        session,
        content_list_ids,
        contentLists,
        [RepostType.contentList, RepostType.album],
        [SaveType.contentList, SaveType.album],
        current_user_id,
    )

    for contentList in contentLists:
        contentList["agreement_count"] = len(contentList["agreements"])
        contentList["agreements"] = contentList["agreements"][:CONTENT_LIST_AGREEMENTS_LIMIT]
        # Trim agreement_ids, which ultimately become added_timestamps
        # and need to match the agreements.
        trimmed_agreement_ids = {agreement["agreement_id"] for agreement in contentList["agreements"]}
        content_list_agreement_ids = contentList["content_list_contents"]["agreement_ids"]
        content_list_agreement_ids = list(
            filter(
                lambda agreement_id: agreement_id["agreement"]
                in trimmed_agreement_ids,  # pylint: disable=W0640
                content_list_agreement_ids,
            )
        )
        contentList["content_list_contents"]["agreement_ids"] = content_list_agreement_ids

    content_lists_map = {contentList["content_list_id"]: contentList for contentList in contentLists}

    if with_agreements:
        # populate agreement metadata
        agreements = []
        for contentList in contentLists:
            content_list_agreements = contentList["agreements"]
            agreements.extend(content_list_agreements)
        agreement_ids = [agreement["agreement_id"] for agreement in agreements]
        populated_agreements = populate_agreement_metadata(
            session, agreement_ids, agreements, current_user_id
        )

        # Add users if necessary
        add_users_to_agreements(session, populated_agreements, current_user_id)

        # Re-associate agreements with contentLists
        # agreement_id -> populated_agreement
        populated_agreement_map = {agreement["agreement_id"]: agreement for agreement in populated_agreements}
        for contentList in content_lists_map.values():
            for i in range(len(contentList["agreements"])):
                agreement_id = contentList["agreements"][i]["agreement_id"]
                populated = populated_agreement_map[agreement_id]
                contentList["agreements"][i] = populated
            contentList["agreements"] = list(map(extend_agreement, contentList["agreements"]))

    # re-sort contentLists to original order, because populate_content_list_metadata
    # unsorts.
    sorted_content_lists = [content_lists_map[content_list_id] for content_list_id in content_list_ids]

    # Add users to contentLists
    user_id_list = get_users_ids(sorted_content_lists)
    users = get_users_by_id(session, user_id_list, current_user_id, use_request_context)
    for contentList in sorted_content_lists:
        user = users[contentList["content_list_owner_id"]]
        if user:
            contentList["user"] = user

    # Extend the contentLists
    contentLists = list(map(extend_content_list, contentLists))
    return sorted_content_lists


def get_trending_content_lists(args: GetTrendingContentListsArgs, strategy):
    """Returns Trending ContentLists. Checks Redis cache for unpopulated contentLists."""
    db = get_db_read_replica()
    with db.scoped_session() as session:
        return _get_trending_content_lists_with_session(session, args, strategy)


def get_full_trending_content_lists(request, args, strategy):
    offset, limit = format_offset(args), format_limit(args, TRENDING_LIMIT)
    current_user_id, time = args.get("user_id"), args.get("time", "week")
    time = "week" if time not in ["week", "month", "year"] else time

    # If we have a user_id, we call into `get_trending_content_list`
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
        contentLists = get_trending_content_lists(args, strategy)
    else:
        args = {
            "time": time,
            "with_agreements": True,
        }
        key = get_trending_cache_key(to_dict(request.args), request.path)
        contentLists = use_redis_cache(
            key, TRENDING_TTL_SEC, lambda: get_trending_content_lists(args, strategy)
        )
        contentLists = contentLists[offset : limit + offset]

    return contentLists
