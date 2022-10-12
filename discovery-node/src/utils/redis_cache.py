import functools
import json
import logging
from typing import Any, List  # pylint: disable=C0302

from flask.globals import request
from src.utils import redis_connection
from src.utils.query_params import stringify_query_params

logger = logging.getLogger(__name__)

# Redis Key Convention:
# API_V1:path:queryparams

internal_api_cache_prefix = "INTERNAL_API"
cache_prefix = "API_V1_ROUTE"
default_ttl_sec = 60


def extract_key(path, arg_items, cache_prefix_override=None):
    # filter out query-params with 'None' values
    filtered_arg_items = filter(lambda x: x[1] is not None, arg_items)
    req_args = stringify_query_params(filtered_arg_items)
    prefix = cache_prefix_override if cache_prefix_override else cache_prefix
    key = f"{prefix}:{path}:{req_args}"
    return key


def use_redis_cache(key, ttl_sec, work_func):
    """Attempts to return value by key, otherwise caches and returns `work_func`"""
    redis = redis_connection.get_redis()
    cached_value = get_json_cached_key(redis, key)
    if cached_value:
        return cached_value
    to_cache = work_func()
    set_json_cached_key(redis, key, to_cache, ttl_sec)
    return to_cache


def get_json_cached_key(redis, key: str) -> Any:
    """
    Gets a JSON serialized value from the cache.
    """
    cached_value = redis.get(key)
    if cached_value:
        logger.debug(f"Redis Cache - hit {key}")
        try:
            deserialized = json.loads(cached_value)
            return deserialized
        except Exception as e:
            logger.warning(f"Unable to deserialize json cached response: {e}")
            # In the case we are unable to deserialize, delete the key so that
            # it may be properly re-cached.
            redis.delete(key)
            return None
    logger.debug(f"Redis Cache - miss {key}")
    return None


def get_all_json_cached_key(redis, keys: List[str]) -> List[Any]:
    """
    Gets all the JSON serialized values from the cache for provided keys.
    Returns an ordered list mapped from the provided keys.
    If any value is not de-serializable, `None` is returned in place.
    """
    cached_values = redis.mget(keys)
    results = []
    for i in range(len(cached_values)):
        val = cached_values[i]
        key = keys[i]
        if val:
            try:
                deserialized = json.loads(val)
                results.append(deserialized)
            except Exception as e:
                logger.warning(f"Unable to deserialize json cached response: {e}")
                # In the case we are unable to deserialize, delete the key so that
                # it may be properly re-cached.
                redis.delete(key)
                results.append(None)
        else:
            results.append(None)
    return results


def set_json_cached_key(redis, key, obj, ttl=None):
    """
    Sets an obj int the cache via JSON serialization.
    """
    # Default converts datetime and other unparseables to str.
    serialized = json.dumps(obj, default=str)
    redis.set(key, serialized, ttl)


def cache(**kwargs):
    """
    Cache decorator.
    Should be called with `@cache(ttl_sec=123, transform=transform_response, cache_prefix_override='some-prefix')`

    Arguments:
        ttl_sec: optional,number The time in seconds to cache the response if
            status code < 400
        transform: optional,func The transform function of the wrapped function
            to convert the function response to request response
        cache_prefix_override: optional,the prefix for the cache key to use
            currently the cache decorator function has a default prefix for public API routes
            this param allows us to override the prefix for the internal API routes and avoid confusion

    Usage Notes:
        If the wrapped function returns a tuple, the transform function will not
        be run on the response. The first item of the tuple must be serializable.

        If the wrapped function returns a single response, the transform function
        must be passed to the decorator. The wrapper function response must be
        serializable.

    Decorators in Python are just higher-order-functions that accept a function
    as a single parameter, and return a function that wraps the input function.

    In this case, because we need to pass kwargs into our decorator function,
    we need an additional layer of wrapping; the outermost function accepts the kwargs,
    and when called, returns the decorating function `outer_wrap`, which in turn returns
    the wrapped input function, `inner_wrap`.

    @functools.wraps simply ensures that if Python introspects `inner_wrap`, it refers to
    `func` rather than `inner_wrap`.
    """
    ttl_sec = kwargs["ttl_sec"] if "ttl_sec" in kwargs else default_ttl_sec
    transform = kwargs["transform"] if "transform" in kwargs else None
    cache_prefix_override = (
        kwargs["cache_prefix_override"] if "cache_prefix_override" in kwargs else None
    )
    redis = redis_connection.get_redis()

    def outer_wrap(func):
        @functools.wraps(func)
        def inner_wrap(*args, **kwargs):
            has_user_id = (
                "user_id" in request.args and request.args["user_id"] is not None
            )
            key = extract_key(request.path, request.args.items(), cache_prefix_override)
            if not has_user_id:
                cached_resp = get_json_cached_key(redis, key)
                if cached_resp:
                    if transform is not None:
                        return transform(cached_resp)
                    return cached_resp, 200

            response = func(*args, **kwargs)

            if len(response) == 2:
                resp, status_code = response
                if status_code < 400:
                    set_json_cached_key(redis, key, resp, ttl_sec)
                return resp, status_code
            set_json_cached_key(redis, key, response, ttl_sec)
            return transform(response)

        return inner_wrap

    return outer_wrap


def get_user_id_cache_key(id):
    return f"user:id:{id}"


def get_digital_content_id_cache_key(id):
    return f"digital_content:id:{id}"


def get_content_list_id_cache_key(id):
    return f"contentList:id:{id}"


def get_sp_id_key(id):
    return f"sp:id:{id}"


def remove_cached_user_ids(redis, user_ids):
    try:
        user_keys = list(map(get_user_id_cache_key, user_ids))
        redis.delete(*user_keys)
    except Exception as e:
        logger.error("Unable to remove cached users: %s", e, exc_info=True)


def remove_cached_digital_content_ids(redis, digital_content_ids):
    try:
        digital_content_keys = list(map(get_digital_content_id_cache_key, digital_content_ids))
        redis.delete(*digital_content_keys)
    except Exception as e:
        logger.error("Unable to remove cached agreements: %s", e, exc_info=True)


def remove_cached_content_list_ids(redis, content_list_ids):
    try:
        content_list_keys = list(map(get_content_list_id_cache_key, content_list_ids))
        redis.delete(*content_list_keys)
    except Exception as e:
        logger.error("Unable to remove cached contentLists: %s", e, exc_info=True)


def get_trending_cache_key(request_items, request_path):
    request_items.pop("limit", None)
    request_items.pop("offset", None)
    return extract_key(request_path, request_items.items())
