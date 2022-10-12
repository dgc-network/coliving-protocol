import logging

from src.queries.get_trending import get_trending
from src.queries.get_trending_digital_contents import TRENDING_TTL_SEC
from src.trending_strategies.trending_strategy_factory import DEFAULT_TRENDING_VERSIONS
from src.trending_strategies.trending_type_and_version import TrendingType
from src.utils.redis_cache import extract_key, use_redis_cache

logger = logging.getLogger(__name__)

request_cache_path = "/v1/full/agreements/trending"


def get_time_trending(cache_args, time, limit, strategy):
    time_params = {**cache_args, "time": time}

    path = request_cache_path
    if strategy.version != DEFAULT_TRENDING_VERSIONS[TrendingType.AGREEMENTS]:
        path += f"/{strategy.version.value}"

    time_cache_key = extract_key(path, time_params.items())
    time_trending = use_redis_cache(
        time_cache_key, TRENDING_TTL_SEC, lambda: get_trending(time_params, strategy)
    )
    time_trending_digital_content_ids = [
        {"digital_content_id": digital_content["digital_content_id"]} for digital_content in time_trending
    ]
    time_trending_digital_content_ids = time_trending_digital_content_ids[:limit]
    return time_trending_digital_content_ids


def get_trending_ids(args, strategy):
    """
    Fetches the ids of the trending agreements using the route's cache

    Args:
        args: (dict) The args of the request
        args.limit: (number) The number of digital_content ids to return
        args.genre: (string?) The genre to fetch the trending agreements for
        strategy: (string?) The strategy to apply to compute trending

    Returns:
        trending_times_id: (dict) Dictionary containing the week/month/year trending digital_content ids
    """

    cache_args = {}
    limit = args["limit"]
    if "genre" in args:
        cache_args["genre"] = args["genre"]

    week_trending_digital_content_ids = get_time_trending(cache_args, "week", limit, strategy)
    month_trending_digital_content_ids = get_time_trending(cache_args, "month", limit, strategy)
    year_trending_digital_content_ids = get_time_trending(cache_args, "year", limit, strategy)

    return {
        "week": week_trending_digital_content_ids,
        "month": month_trending_digital_content_ids,
        "year": year_trending_digital_content_ids,
    }
