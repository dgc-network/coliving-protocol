import logging

from src.api.v1.helpers import extend_digital_content, format_limit, format_offset, to_dict
from src.queries.get_trending_digital_contents import (
    TRENDING_LIMIT,
    TRENDING_TTL_SEC,
    get_trending_digital_contents,
)
from src.utils.helpers import decode_string_id  # pylint: disable=C0302
from src.utils.redis_cache import get_trending_cache_key, use_redis_cache

logger = logging.getLogger(__name__)


def get_trending(args, strategy):
    """Get Trending, shared between full and regular endpoints."""
    # construct args
    time = args.get("time") if args.get("time") is not None else "week"
    current_user_id = args.get("user_id")
    args = {
        "time": time,
        "genre": args.get("genre", None),
        "with_users": True,
        "limit": TRENDING_LIMIT,
        "offset": 0,
    }

    # decode and add user_id if necessary
    if current_user_id:
        decoded_id = decode_string_id(current_user_id)
        args["current_user_id"] = decoded_id

    digitalContents = get_trending_digital_contents(args, strategy)
    return list(map(extend_digital_content, digitalContents))


def get_full_trending(request, args, strategy):
    offset = format_offset(args)
    limit = format_limit(args, TRENDING_LIMIT)
    key = get_trending_cache_key(to_dict(request.args), request.path)

    # Attempt to use the cached digitalContents list
    if args["user_id"] is not None:
        full_trending = get_trending(args, strategy)
    else:
        full_trending = use_redis_cache(
            key, TRENDING_TTL_SEC, lambda: get_trending(args, strategy)
        )
    trending_digital_contents = full_trending[offset : limit + offset]
    return trending_digital_contents
