from typing import Optional, TypedDict

from sqlalchemy import desc
from sqlalchemy.orm.session import Session
from src.models.agreements.agreement_trending_score import AgreementTrendingScore
from src.queries.get_unpopulated_agreements import get_unpopulated_agreements
from src.queries.query_helpers import (
    get_users_by_id,
    get_users_ids,
    populate_agreement_metadata,
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
    trending_agreements = generate_trending(session, time_range, genre, limit, 0, strategy)

    agreement_scores = [
        strategy.get_agreement_score(time_range, agreement)
        for agreement in trending_agreements["listen_counts"]
    ]
    # Re apply the limit just in case we did decide to include more agreements in the scoring than the limit
    sorted_agreement_scores = sorted(
        agreement_scores, key=lambda k: (k["score"], k["agreement_id"]), reverse=True
    )[:limit]
    agreement_ids = [agreement["agreement_id"] for agreement in sorted_agreement_scores]

    agreements = get_unpopulated_agreements(session, agreement_ids)
    return (agreements, agreement_ids)


def generate_unpopulated_trending_from_mat_views(
    session, genre, time_range, strategy, limit=TRENDING_LIMIT
):

    # use all time instead of year for version EJ57D
    if strategy.version == TrendingVersion.EJ57D and time_range == "year":
        time_range = "allTime"
    elif strategy.version != TrendingVersion.EJ57D and time_range == "allTime":
        time_range = "year"

    trending_agreement_ids_query = session.query(
        AgreementTrendingScore.agreement_id, AgreementTrendingScore.score
    ).filter(
        AgreementTrendingScore.type == strategy.trending_type.name,
        AgreementTrendingScore.version == strategy.version.name,
        AgreementTrendingScore.time_range == time_range,
    )

    if genre:
        trending_agreement_ids_query = trending_agreement_ids_query.filter(
            AgreementTrendingScore.genre == genre
        )

    trending_agreement_ids = (
        trending_agreement_ids_query.order_by(
            desc(AgreementTrendingScore.score), desc(AgreementTrendingScore.agreement_id)
        )
        .limit(limit)
        .all()
    )

    agreement_ids = [agreement_id[0] for agreement_id in trending_agreement_ids]
    agreements = get_unpopulated_agreements(session, agreement_ids)
    return (agreements, agreement_ids)


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


class GetTrendingAgreementsArgs(TypedDict, total=False):
    current_user_id: Optional[int]
    genre: Optional[str]
    time: str


def get_trending_agreements(args: GetTrendingAgreementsArgs, strategy: BaseTrendingStrategy):
    """Gets trending by getting the currently cached agreements and then populating them."""
    db = get_db_read_replica()
    with db.scoped_session() as session:
        return _get_trending_agreements_with_session(session, args, strategy)


def _get_trending_agreements_with_session(
    session: Session, args: GetTrendingAgreementsArgs, strategy: BaseTrendingStrategy
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
    (agreements, agreement_ids) = use_redis_cache(
        key,
        None,
        make_generate_unpopulated_trending(session, genre, time_range, strategy),
    )

    # populate agreement metadata
    agreements = populate_agreement_metadata(session, agreement_ids, agreements, current_user_id)
    agreements_map = {agreement["agreement_id"]: agreement for agreement in agreements}

    # Re-sort the populated agreements b/c it loses sort order in sql query
    sorted_agreements = [agreements_map[agreement_id] for agreement_id in agreement_ids]

    if args.get("with_users", False):
        user_id_list = get_users_ids(sorted_agreements)
        users = get_users_by_id(session, user_id_list, current_user_id)
        for agreement in sorted_agreements:
            user = users[agreement["owner_id"]]
            if user:
                agreement["user"] = user
    return sorted_agreements
