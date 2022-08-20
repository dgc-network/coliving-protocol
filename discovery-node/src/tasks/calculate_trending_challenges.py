import logging
import time
from datetime import datetime
from typing import Optional

from redis import Redis
from sqlalchemy.orm.session import Session
from src.challenges.challenge_event import ChallengeEvent
from src.challenges.challenge_event_bus import ChallengeEventBus
from src.queries.get_trending_contentLists import (
    GetTrendingContentListsArgs,
    _get_trending_contentLists_with_session,
)
from src.queries.get_trending_agreements import _get_trending_agreements_with_session
from src.queries.get_underground_trending import (
    GetUndergroundTrendingAgreementcArgs,
    _get_underground_trending_with_session,
)
from src.tasks.aggregates import get_latest_blocknumber
from src.tasks.celery_app import celery
from src.trending_strategies.trending_strategy_factory import TrendingStrategyFactory
from src.trending_strategies.trending_type_and_version import TrendingType
from src.utils.prometheus_metric import save_duration_metric
from src.utils.redis_constants import most_recent_indexed_block_redis_key
from src.utils.session_manager import SessionManager

logger = logging.getLogger(__name__)

trending_strategy_factory = TrendingStrategyFactory()


def date_to_week(date: datetime) -> str:
    return date.strftime("%Y-%m-%d")


def get_latest_blocknumber_via_redis(session: Session, redis: Redis) -> Optional[int]:
    # get latest db state from redis cache
    latest_indexed_block_num = redis.get(most_recent_indexed_block_redis_key)
    if latest_indexed_block_num is not None:
        return int(latest_indexed_block_num)

    return get_latest_blocknumber(session)


# The number of users to recieve the trending rewards
TRENDING_LIMIT = 5


def dispatch_trending_challenges(
    challenge_bus: ChallengeEventBus,
    challenge_event: ChallengeEvent,
    latest_blocknumber: int,
    agreements,
    version: str,
    date: datetime,
    type: TrendingType,
):
    for idx, agreement in enumerate(agreements):
        challenge_bus.dispatch(
            challenge_event,
            latest_blocknumber,
            agreement["owner_id"],
            {
                "id": agreement["agreement_id"],
                "user_id": agreement["owner_id"],
                "rank": idx + 1,
                "type": str(type),
                "version": str(version),
                "week": date_to_week(date),
            },
        )


def enqueue_trending_challenges(
    db: SessionManager, redis: Redis, challenge_bus: ChallengeEventBus, date: datetime
):
    logger.info(
        "calculate_trending_challenges.py | Start calculating trending challenges"
    )
    update_start = time.time()
    with db.scoped_session() as session, challenge_bus.use_scoped_dispatch_queue():

        latest_blocknumber = get_latest_blocknumber_via_redis(session, redis)
        if latest_blocknumber is None:
            logger.error(
                "calculate_trending_challenges.py | Unable to get latest block number"
            )
            return

        trending_agreement_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.AGREEMENTS
        ).keys()

        time_range = "week"
        for version in trending_agreement_versions:
            strategy = trending_strategy_factory.get_strategy(
                TrendingType.AGREEMENTS, version
            )
            top_agreements = _get_trending_agreements_with_session(
                session, {"time": time_range}, strategy
            )
            top_agreements = top_agreements[:TRENDING_LIMIT]
            dispatch_trending_challenges(
                challenge_bus,
                ChallengeEvent.trending_agreement,
                latest_blocknumber,
                top_agreements,
                version,
                date,
                TrendingType.AGREEMENTS,
            )

        # Cache underground trending
        underground_trending_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.UNDERGROUND_AGREEMENTS
        ).keys()
        for version in underground_trending_versions:
            strategy = trending_strategy_factory.get_strategy(
                TrendingType.UNDERGROUND_AGREEMENTS, version
            )
            underground_args: GetUndergroundTrendingAgreementcArgs = {
                "offset": 0,
                "limit": TRENDING_LIMIT,
            }
            top_agreements = _get_underground_trending_with_session(
                session, underground_args, strategy, False
            )

            dispatch_trending_challenges(
                challenge_bus,
                ChallengeEvent.trending_underground,
                latest_blocknumber,
                top_agreements,
                version,
                date,
                TrendingType.UNDERGROUND_AGREEMENTS,
            )

        trending_contentList_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.CONTENT_LISTS
        ).keys()
        for version in trending_contentList_versions:
            strategy = trending_strategy_factory.get_strategy(
                TrendingType.CONTENT_LISTS, version
            )
            contentLists_args: GetTrendingContentListsArgs = {
                "limit": TRENDING_LIMIT,
                "offset": 0,
                "time": time_range,
            }
            trending_contentLists = _get_trending_contentLists_with_session(
                session, contentLists_args, strategy, False
            )
            for idx, contentList in enumerate(trending_contentLists):
                challenge_bus.dispatch(
                    ChallengeEvent.trending_contentList,
                    latest_blocknumber,
                    contentList["contentList_owner_id"],
                    {
                        "id": contentList["contentList_id"],
                        "user_id": contentList["contentList_owner_id"],
                        "rank": idx + 1,
                        "type": str(TrendingType.CONTENT_LISTS),
                        "version": str(version),
                        "week": date_to_week(date),
                    },
                )

    update_end = time.time()
    update_total = update_end - update_start
    logger.info(
        f"calculate_trending_challenges.py | Finished calculating trending in {update_total} seconds"
    )


# ####### CELERY TASKS ####### #
@celery.task(name="calculate_trending_challenges", bind=True)
@save_duration_metric(metric_group="celery_task")
def calculate_trending_challenges_task(self, date=None):
    """Caches all trending combination of time-range and genre (including no genre)."""
    if date is None:
        logger.error("calculate_trending_challenges.py | Must be called with a date")
        return
    # Celery gives this to us formatted as '2022-01-01T00:00:00', need to parse into datetime
    date = datetime.fromisoformat(date)
    db = calculate_trending_challenges_task.db
    redis = calculate_trending_challenges_task.redis
    challenge_bus = calculate_trending_challenges_task.challenge_event_bus
    have_lock = False
    update_lock = redis.lock("calculate_trending_challenges_lock", timeout=7200)
    try:
        have_lock = update_lock.acquire(blocking=False)
        if have_lock:
            enqueue_trending_challenges(db, redis, challenge_bus, date)
        else:
            logger.info(
                "calculate_trending_challenges.py | Failed to acquire index trending lock"
            )
    except Exception as e:
        logger.error(
            "calculate_trending_challenges.py | Fatal error in main loop", exc_info=True
        )
        raise e
    finally:
        if have_lock:
            update_lock.release()
