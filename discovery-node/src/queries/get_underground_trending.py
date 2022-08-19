import logging  # pylint: disable=C0302
from datetime import datetime, timedelta
from typing import Any, Optional, TypedDict

import redis
from sqlalchemy import func
from sqlalchemy.orm.session import Session
from src.api.v1.helpers import extend_agreement, format_limit, format_offset, to_dict
from src.models.social.aggregate_plays import AggregatePlay
from src.models.social.follow import Follow
from src.models.social.repost import RepostType
from src.models.social.save import SaveType
from src.models.agreements.agreement import Agreement
from src.models.users.aggregate_user import AggregateUser
from src.models.users.user import User
from src.queries.get_trending_agreements import (
    TRENDING_LIMIT,
    TRENDING_TTL_SEC,
    make_trending_cache_key,
)
from src.queries.get_unpopulated_agreements import get_unpopulated_agreements
from src.queries.query_helpers import (
    get_karma,
    get_repost_counts,
    get_save_counts,
    get_users_by_id,
    get_users_ids,
    populate_agreement_metadata,
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

UNDERGROUND_TRENDING_CACHE_KEY = "generated-trending-agreements-underground"
UNDERGROUND_TRENDING_LENGTH = 50


def get_scorable_agreement_data(session, redis_instance, strategy):
    """
    Returns a map: {
        "agreement_id": string
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
    agreement_ids = []
    old_trending = get_json_cached_key(redis_instance, trending_key)
    if old_trending:
        agreement_ids = old_trending[1]
    exclude_agreement_ids = agreement_ids[:qr]

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
            AggregatePlay.play_item_id.label("agreement_id"),
            follower_query.c.user_id,
            follower_query.c.follower_count,
            AggregatePlay.count,
            Agreement.created_at,
            follower_query.c.is_verified,
        )
        .join(Agreement, Agreement.agreement_id == AggregatePlay.play_item_id)
        .join(follower_query, follower_query.c.user_id == Agreement.owner_id)
        .join(AggregateUser, AggregateUser.user_id == Agreement.owner_id)
        .filter(
            Agreement.is_current == True,
            Agreement.is_delete == False,
            Agreement.is_unlisted == False,
            Agreement.stem_of == None,
            Agreement.agreement_id.notin_(exclude_agreement_ids),
            Agreement.created_at >= (datetime.now() - timedelta(days=o)),
            follower_query.c.follower_count < S,
            follower_query.c.follower_count >= pt,
            AggregateUser.following_count < r,
            AggregatePlay.count >= q,
        )
    ).all()

    agreements_map = {
        record[0]: {
            "agreement_id": record[0],
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

    agreement_ids = [record[0] for record in base_query]

    # Get all the extra values
    repost_counts = get_repost_counts(
        session, False, False, agreement_ids, [RepostType.agreement]
    )

    windowed_repost_counts = get_repost_counts(
        session, False, False, agreement_ids, [RepostType.agreement], None, "week"
    )

    save_counts = get_save_counts(session, False, False, agreement_ids, [SaveType.agreement])

    windowed_save_counts = get_save_counts(
        session, False, False, agreement_ids, [SaveType.agreement], None, "week"
    )

    karma_scores = get_karma(session, tuple(agreement_ids), strategy, None, False, xf)

    # Associate all the extra data
    for (agreement_id, repost_count) in repost_counts:
        agreements_map[agreement_id]["repost_count"] = repost_count
    for (agreement_id, repost_count) in windowed_repost_counts:
        agreements_map[agreement_id]["windowed_repost_count"] = repost_count
    for (agreement_id, save_count) in save_counts:
        agreements_map[agreement_id]["save_count"] = save_count
    for (agreement_id, save_count) in windowed_save_counts:
        agreements_map[agreement_id]["windowed_save_count"] = save_count
    for (agreement_id, karma) in karma_scores:
        agreements_map[agreement_id]["karma"] = karma

    return list(agreements_map.values())


def make_underground_trending_cache_key(
    version=DEFAULT_TRENDING_VERSIONS[TrendingType.UNDERGROUND_AGREEMENTS],
):
    version_name = (
        f":{version.name}"
        if version != DEFAULT_TRENDING_VERSIONS[TrendingType.UNDERGROUND_AGREEMENTS]
        else ""
    )
    return f"{UNDERGROUND_TRENDING_CACHE_KEY}{version_name}"


def make_get_unpopulated_agreements(session, redis_instance, strategy):
    def wrapped():
        # Score and sort
        agreement_scoring_data = get_scorable_agreement_data(session, redis_instance, strategy)
        scored_agreements = [
            strategy.get_agreement_score("week", agreement) for agreement in agreement_scoring_data
        ]
        sorted_agreements = sorted(scored_agreements, key=lambda k: k["score"], reverse=True)
        sorted_agreements = sorted_agreements[:UNDERGROUND_TRENDING_LENGTH]

        # Get unpopulated metadata
        agreement_ids = [agreement["agreement_id"] for agreement in sorted_agreements]
        agreements = get_unpopulated_agreements(session, agreement_ids)
        return (agreements, agreement_ids)

    return wrapped


class GetUndergroundTrendingAgreementcArgs(TypedDict, total=False):
    current_user_id: Optional[Any]
    offset: int
    limit: int


def _get_underground_trending_with_session(
    session: Session,
    args: GetUndergroundTrendingAgreementcArgs,
    strategy,
    use_request_context=True,
):
    current_user_id = args.get("current_user_id", None)
    limit, offset = args.get("limit"), args.get("offset")
    key = make_underground_trending_cache_key(strategy.version)

    (agreements, agreement_ids) = use_redis_cache(
        key, None, make_get_unpopulated_agreements(session, redis_conn, strategy)
    )

    # Apply limit + offset early to reduce the amount of
    # population work we have to do
    if limit is not None and offset is not None:
        agreement_ids = agreement_ids[offset : limit + offset]

    agreements = populate_agreement_metadata(session, agreement_ids, agreements, current_user_id)

    agreements_map = {agreement["agreement_id"]: agreement for agreement in agreements}

    # Re-sort the populated agreements b/c it loses sort order in sql query
    sorted_agreements = [agreements_map[agreement_id] for agreement_id in agreement_ids]
    user_id_list = get_users_ids(sorted_agreements)
    users = get_users_by_id(session, user_id_list, current_user_id, use_request_context)
    for agreement in sorted_agreements:
        user = users[agreement["owner_id"]]
        if user:
            agreement["user"] = user
    sorted_agreements = list(map(extend_agreement, sorted_agreements))
    return sorted_agreements


def _get_underground_trending(args: GetUndergroundTrendingAgreementcArgs, strategy):
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
        # If no user ID, fetch all cached agreements
        # and perform pagination here, passing
        # no args so we get the full list of agreements.
        key = get_trending_cache_key(to_dict(request.args), request.path)
        trending = use_redis_cache(
            key, TRENDING_TTL_SEC, lambda: _get_underground_trending({}, strategy)
        )
        trending = trending[offset : limit + offset]
    return trending
