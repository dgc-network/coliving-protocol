from typing import Optional, TypedDict

from sqlalchemy import desc
from sqlalchemy.orm.session import Session
from src.models.digitalContents.digital_content_trending_score import DigitalContentTrendingScore
from src.queries.get_unpopulated_digital_contents import get_unpopulated_digital_contents
from src.queries.query_helpers import (
    get_users_by_id,
    get_users_ids,
    populate_digital_content_metadata,
)
from src.tasks.generate_trending import generate_trending
from src.trending_strategies.base_trending_strategy import BaseTrendingStrategy
from src.trending_strategies.trending_strategy_factory import DEFAULT_TRENDING_VERSIONS
from src.trending_strategies.trending_type_and_version import (
    TrendingType,
    TrendingVersion,
)
from src.utils.db_session import get_db_read_replica
from src.utils.redis_cache import use_redis_cache

TRENDING_LIMIT = 100
TRENDING_TTL_SEC = 30 * 60


def make_trending_cache_key(
    time_range, genre, version=DEFAULT_TRENDING_VERSIONS[TrendingType.AGREEMENTS]
):
    """Makes a cache key resembling `generated-trending:week:electronic`"""
    version_name = (
        f":{version.name}"
        if version != DEFAULT_TRENDING_VERSIONS[TrendingType.AGREEMENTS]
        else ""
    )
    return f"generated-trending{version_name}:{time_range}:{(genre.lower() if genre else '')}"


def generate_unpopulated_trending(
    session, genre, time_range, strategy, limit=TRENDING_LIMIT
):
    trending_digital_contents = generate_trending(session, time_range, genre, limit, 0, strategy)

    digital_content_scores = [
        strategy.get_digital_content_score(time_range, digital_content)
        for digital_content in trending_digital_contents["listen_counts"]
    ]
    # Re apply the limit just in case we did decide to include more digitalContents in the scoring than the limit
    sorted_digital_content_scores = sorted(
        digital_content_scores, key=lambda k: (k["score"], k["digital_content_id"]), reverse=True
    )[:limit]
    digital_content_ids = [digital_content["digital_content_id"] for digital_content in sorted_digital_content_scores]

    digitalContents = get_unpopulated_digital_contents(session, digital_content_ids)
    return (digitalContents, digital_content_ids)


def generate_unpopulated_trending_from_mat_views(
    session, genre, time_range, strategy, limit=TRENDING_LIMIT
):

    # use all time instead of year for version EJ57D
    if strategy.version == TrendingVersion.EJ57D and time_range == "year":
        time_range = "allTime"
    elif strategy.version != TrendingVersion.EJ57D and time_range == "allTime":
        time_range = "year"

    trending_digital_content_ids_query = session.query(
        DigitalContentTrendingScore.digital_content_id, DigitalContentTrendingScore.score
    ).filter(
        DigitalContentTrendingScore.type == strategy.trending_type.name,
        DigitalContentTrendingScore.version == strategy.version.name,
        DigitalContentTrendingScore.time_range == time_range,
    )

    if genre:
        trending_digital_content_ids_query = trending_digital_content_ids_query.filter(
            DigitalContentTrendingScore.genre == genre
        )

    trending_digital_content_ids = (
        trending_digital_content_ids_query.order_by(
            desc(DigitalContentTrendingScore.score), desc(DigitalContentTrendingScore.digital_content_id)
        )
        .limit(limit)
        .all()
    )

    digital_content_ids = [digital_content_id[0] for digital_content_id in trending_digital_content_ids]
    digitalContents = get_unpopulated_digital_contents(session, digital_content_ids)
    return (digitalContents, digital_content_ids)


def make_generate_unpopulated_trending(session, genre, time_range, strategy):
    """Wraps a call to `generate_unpopulated_trending` for use in `use_redis_cache`, which
    expects to be passed a function with no arguments."""

    def wrapped():
        if strategy.use_mat_view:
            return generate_unpopulated_trending_from_mat_views(
                session, genre, time_range, strategy
            )
        return generate_unpopulated_trending(session, genre, time_range, strategy)

    return wrapped


class GetTrendingDigitalContentsArgs(TypedDict, total=False):
    current_user_id: Optional[int]
    genre: Optional[str]
    time: str


def get_trending_digital_contents(args: GetTrendingDigitalContentsArgs, strategy: BaseTrendingStrategy):
    """Gets trending by getting the currently cached digitalContents and then populating them."""
    db = get_db_read_replica()
    with db.scoped_session() as session:
        return _get_trending_digital_contents_with_session(session, args, strategy)


def _get_trending_digital_contents_with_session(
    session: Session, args: GetTrendingDigitalContentsArgs, strategy: BaseTrendingStrategy
):
    current_user_id, genre, time = (
        args.get("current_user_id"),
        args.get("genre"),
        args.get("time", "week"),
    )
    time_range = "week" if time not in ["week", "month", "year", "allTime"] else time
    key = make_trending_cache_key(time_range, genre, strategy.version)

    # Will try to hit cached trending from task, falling back
    # to generating it here if necessary and storing it with no TTL
    (digitalContents, digital_content_ids) = use_redis_cache(
        key,
        None,
        make_generate_unpopulated_trending(session, genre, time_range, strategy),
    )

    # populate digital_content metadata
    digitalContents = populate_digital_content_metadata(session, digital_content_ids, digitalContents, current_user_id)
    digitalContents_map = {digital_content["digital_content_id"]: digital_content for digital_content in digitalContents}

    # Re-sort the populated digitalContents b/c it loses sort order in sql query
    sorted_digital_contents = [digitalContents_map[digital_content_id] for digital_content_id in digital_content_ids]

    if args.get("with_users", False):
        user_id_list = get_users_ids(sorted_digital_contents)
        users = get_users_by_id(session, user_id_list, current_user_id)
        for digital_content in sorted_digital_contents:
            user = users[digital_content["owner_id"]]
            if user:
                digital_content["user"] = user
    return sorted_digital_contents
