import logging
import time

from src.queries.get_trending_content_lists import (
    make_get_unpopulated_content_lists,
    make_trending_cache_key,
)
from src.tasks.celery_app import celery
from src.trending_strategies.trending_strategy_factory import TrendingStrategyFactory
from src.trending_strategies.trending_type_and_version import TrendingType
from src.utils.prometheus_metric import save_duration_metric
from src.utils.redis_cache import set_json_cached_key
from src.utils.redis_constants import trending_content_lists_last_completion_redis_key

logger = logging.getLogger(__name__)

TIME_RANGES = ["week", "month", "year"]

trending_strategy_factory = TrendingStrategyFactory()


def cache_trending(db, redis, strategy):
    with db.scoped_session() as session:
        for time_range in TIME_RANGES:
            key = make_trending_cache_key(time_range, strategy.version)
            res = make_get_unpopulated_content_lists(session, time_range, strategy)()
            set_json_cached_key(redis, key, res)


@celery.task(name="cache_trending_content_lists", bind=True)
@save_duration_metric(metric_group="celery_task")
def cache_trending_content_lists(self):
    """Caches trending contentLists for time period"""

    db = cache_trending_content_lists.db_read_replica
    redis = cache_trending_content_lists.redis

    have_lock = False
    update_lock = redis.lock("cache_trending_content_lists_lock", timeout=7200)

    try:
        have_lock = update_lock.acquire(blocking=False)

        if have_lock:
            trending_content_list_versions = (
                trending_strategy_factory.get_versions_for_type(
                    TrendingType.CONTENT_LISTS
                ).keys()
            )
            for version in trending_content_list_versions:
                logger.info(
                    f"cache_trending_content_lists.py ({version.name} version) | Starting"
                )
                strategy = trending_strategy_factory.get_strategy(
                    TrendingType.CONTENT_LISTS, version
                )
                start_time = time.time()
                cache_trending(db, redis, strategy)
                end_time = time.time()
                logger.info(
                    f"cache_trending_content_lists.py ({version.name} version) | \
                    Finished in {end_time - start_time} seconds"
                )
                redis.set(trending_content_lists_last_completion_redis_key, int(end_time))
        else:
            logger.info("cache_trending_content_lists.py | Failed to acquire lock")
    except Exception as e:
        logger.error(
            "cache_trending_content_lists.py | Fatal error in main loop", exc_info=True
        )
        raise e
    finally:
        if have_lock:
            update_lock.release()
