import logging  # pylint: disable=C0302
from datetime import datetime, timedelta
from typing import Any, Optional, TypedDict

import redis
from sqlalchemy import func
from sqlalchemy.orm.session import Session
from src.api.v1.helpers import extend_digital_content, format_limit, format_offset, to_dict
from src.models.social.aggregate_plays import AggregatePlay
from src.models.social.follow import Follow
from src.models.social.repost import RepostType
from src.models.social.save import SaveType
from src.models.digitalContents.digital_content import DigitalContent
from src.models.users.aggregate_user import AggregateUser
from src.models.users.user import User
from src.queries.get_trending_digital_contents import (
    TRENDING_LIMIT,
    TRENDING_TTL_SEC,
    make_trending_cache_key,
)
from src.queries.get_unpopulated_digital_contents import get_unpopulated_digital_contents
from src.queries.query_helpers import (
    get_karma,
    get_repost_counts,
    get_save_counts,
    get_users_by_id,
    get_users_ids,
    populate_digital_content_metadata,
)
from src.trending_strategies.trending_strategy_factory import DEFAULT_TRENDING_VERSIONS
from src.trending_strategies.trending_type_and_version import TrendingType
from src.utils.config import shared_config
from src.utils.db_session import get_db_read_replica
from src.utils.helpers import decode_string_id
from src.utils.redis_cache import (
    get_json_cached_key,
    get_trending_cache_key,
    use_redis_cache,
)

redis_url = shared_config["redis"]["url"]
redis_conn = redis.Redis.from_url(url=redis_url)

logger = logging.getLogger(__name__)

UNDERGROUND_TRENDING_CACHE_KEY = "generated-trending-digital-contents-underground"
UNDERGROUND_TRENDING_LENGTH = 50


def get_scorable_digital_content_data(session, redis_instance, strategy):
    """
    Returns a map: {
        "digital_content_id": string
        "created_at": string
        "owner_id": number
        "windowed_save_count": number
        "save_count": number
        "repost_count": number
        "windowed_repost_count": number
        "owner_follower_count": number
        "karma": number
        "listens": number
        "owner_verified": boolean
    }
    """

    score_params = strategy.get_score_params()
    S = score_params["S"]
    r = score_params["r"]
    q = score_params["q"]
    o = score_params["o"]
    f = score_params["f"]
    qr = score_params["qr"]
    xf = score_params["xf"]
    pt = score_params["pt"]
    trending_key = make_trending_cache_key("week", None, strategy.version)
    digital_content_ids = []
    old_trending = get_json_cached_key(redis_instance, trending_key)
    if old_trending:
        digital_content_ids = old_trending[1]
    exclude_digital_content_ids = digital_content_ids[:qr]

    # Get followers
    follower_query = (
        session.query(
            Follow.followee_user_id.label("user_id"),
            User.is_verified.label("is_verified"),
            func.count(Follow.followee_user_id).label("follower_count"),
        )
        .join(User, User.user_id == Follow.followee_user_id)
        .filter(
            Follow.is_current == True,
            Follow.is_delete == False,
            User.is_current == True,
            Follow.created_at < (datetime.now() - timedelta(days=f)),
        )
        .group_by(Follow.followee_user_id, User.is_verified)
    ).subquery()

    base_query = (
        session.query(
            AggregatePlay.play_item_id.label("digital_content_id"),
            follower_query.c.user_id,
            follower_query.c.follower_count,
            AggregatePlay.count,
            DigitalContent.created_at,
            follower_query.c.is_verified,
        )
        .join(DigitalContent, DigitalContent.digital_content_id == AggregatePlay.play_item_id)
        .join(follower_query, follower_query.c.user_id == DigitalContent.owner_id)
        .join(AggregateUser, AggregateUser.user_id == DigitalContent.owner_id)
        .filter(
            DigitalContent.is_current == True,
            DigitalContent.is_delete == False,
            DigitalContent.is_unlisted == False,
            DigitalContent.stem_of == None,
            DigitalContent.digital_content_id.notin_(exclude_digital_content_ids),
            DigitalContent.created_at >= (datetime.now() - timedelta(days=o)),
            follower_query.c.follower_count < S,
            follower_query.c.follower_count >= pt,
            AggregateUser.following_count < r,
            AggregatePlay.count >= q,
        )
    ).all()

    digitalContents_map = {
        record[0]: {
            "digital_content_id": record[0],
            "created_at": record[4].isoformat(timespec="seconds"),
            "owner_id": record[1],
            "windowed_save_count": 0,
            "save_count": 0,
            "repost_count": 0,
            "windowed_repost_count": 0,
            "owner_follower_count": record[2],
            "karma": 1,
            "listens": record[3],
            "owner_verified": record[5],
        }
        for record in base_query
    }

    digital_content_ids = [record[0] for record in base_query]

    # Get all the extra values
    repost_counts = get_repost_counts(
        session, False, False, digital_content_ids, [RepostType.digital_content]
    )

    windowed_repost_counts = get_repost_counts(
        session, False, False, digital_content_ids, [RepostType.digital_content], None, "week"
    )

    save_counts = get_save_counts(session, False, False, digital_content_ids, [SaveType.digital_content])

    windowed_save_counts = get_save_counts(
        session, False, False, digital_content_ids, [SaveType.digital_content], None, "week"
    )

    karma_scores = get_karma(session, tuple(digital_content_ids), strategy, None, False, xf)

    # Associate all the extra data
    for (digital_content_id, repost_count) in repost_counts:
        digitalContents_map[digital_content_id]["repost_count"] = repost_count
    for (digital_content_id, repost_count) in windowed_repost_counts:
        digitalContents_map[digital_content_id]["windowed_repost_count"] = repost_count
    for (digital_content_id, save_count) in save_counts:
        digitalContents_map[digital_content_id]["save_count"] = save_count
    for (digital_content_id, save_count) in windowed_save_counts:
        digitalContents_map[digital_content_id]["windowed_save_count"] = save_count
    for (digital_content_id, karma) in karma_scores:
        digitalContents_map[digital_content_id]["karma"] = karma

    return list(digitalContents_map.values())


def make_underground_trending_cache_key(
    version=DEFAULT_TRENDING_VERSIONS[TrendingType.UNDERGROUND_DIGITAL_CONTENTS],
):
    version_name = (
        f":{version.name}"
        if version != DEFAULT_TRENDING_VERSIONS[TrendingType.UNDERGROUND_DIGITAL_CONTENTS]
        else ""
    )
    return f"{UNDERGROUND_TRENDING_CACHE_KEY}{version_name}"


def make_get_unpopulated_digital_contents(session, redis_instance, strategy):
    def wrapped():
        # Score and sort
        digital_content_scoring_data = get_scorable_digital_content_data(session, redis_instance, strategy)
        scored_digital_contents = [
            strategy.get_digital_content_score("week", digital_content) for digital_content in digital_content_scoring_data
        ]
        sorted_digital_contents = sorted(scored_digital_contents, key=lambda k: k["score"], reverse=True)
        sorted_digital_contents = sorted_digital_contents[:UNDERGROUND_TRENDING_LENGTH]

        # Get unpopulated metadata
        digital_content_ids = [digital_content["digital_content_id"] for digital_content in sorted_digital_contents]
        digitalContents = get_unpopulated_digital_contents(session, digital_content_ids)
        return (digitalContents, digital_content_ids)

    return wrapped


class GetUndergroundTrendingDigitalContentcArgs(TypedDict, total=False):
    current_user_id: Optional[Any]
    offset: int
    limit: int


def _get_underground_trending_with_session(
    session: Session,
    args: GetUndergroundTrendingDigitalContentcArgs,
    strategy,
    use_request_context=True,
):
    current_user_id = args.get("current_user_id", None)
    limit, offset = args.get("limit"), args.get("offset")
    key = make_underground_trending_cache_key(strategy.version)

    (digitalContents, digital_content_ids) = use_redis_cache(
        key, None, make_get_unpopulated_digital_contents(session, redis_conn, strategy)
    )

    # Apply limit + offset early to reduce the amount of
    # population work we have to do
    if limit is not None and offset is not None:
        digital_content_ids = digital_content_ids[offset : limit + offset]

    digitalContents = populate_digital_content_metadata(session, digital_content_ids, digitalContents, current_user_id)

    digitalContents_map = {digital_content["digital_content_id"]: digital_content for digital_content in digitalContents}

    # Re-sort the populated digitalContents b/c it loses sort order in sql query
    sorted_digital_contents = [digitalContents_map[digital_content_id] for digital_content_id in digital_content_ids]
    user_id_list = get_users_ids(sorted_digital_contents)
    users = get_users_by_id(session, user_id_list, current_user_id, use_request_context)
    for digital_content in sorted_digital_contents:
        user = users[digital_content["owner_id"]]
        if user:
            digital_content["user"] = user
    sorted_digital_contents = list(map(extend_digital_content, sorted_digital_contents))
    return sorted_digital_contents


def _get_underground_trending(args: GetUndergroundTrendingDigitalContentcArgs, strategy):
    db = get_db_read_replica()
    with db.scoped_session() as session:
        return _get_underground_trending_with_session(session, args, strategy)


def get_underground_trending(request, args, strategy):
    offset, limit = format_offset(args), format_limit(args, TRENDING_LIMIT)
    current_user_id = args.get("user_id")
    args = {"limit": limit, "offset": offset}

    # If user ID, let _get_underground_trending
    # handle caching + limit + offset
    if current_user_id:
        decoded = decode_string_id(current_user_id)
        args["current_user_id"] = decoded
        trending = _get_underground_trending(args, strategy)
    else:
        # If no user ID, fetch all cached digitalContents
        # and perform pagination here, passing
        # no args so we get the full list of digitalContents.
        key = get_trending_cache_key(to_dict(request.args), request.path)
        trending = use_redis_cache(
            key, TRENDING_TTL_SEC, lambda: _get_underground_trending({}, strategy)
        )
        trending = trending[offset : limit + offset]
    return trending
