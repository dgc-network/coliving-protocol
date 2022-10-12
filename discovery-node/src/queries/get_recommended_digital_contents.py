import logging  # pylint: disable=C0302
import random

from src.api.v1.helpers import extend_digital_content, to_dict
from src.queries.get_trending_digital_contents import TRENDING_TTL_SEC, get_trending_digital_contents
from src.utils.helpers import decode_string_id
from src.utils.redis_cache import get_trending_cache_key, use_redis_cache

logger = logging.getLogger(__name__)

DEFAULT_RECOMMENDED_LIMIT = 10


def get_recommended_digital_contents(args, strategy):
    """Gets recommended digitalContents from trending by getting the currently cached digitalContents and then populating them."""
    exclusion_list = args.get("exclusion_list") or []
    time = args.get("time") if args.get("time") is not None else "week"
    current_user_id = args.get("user_id")
    args = {
        "time": time,
        "genre": args.get("genre", None),
        "with_users": True,
        "limit": args.get("limit"),
        "offset": 0,
    }

    # decode and add user_id if necessary
    if current_user_id:
        args["current_user_id"] = decode_string_id(current_user_id)

    digitalContents = get_trending_digital_contents(args, strategy)
    filtered_digital_contents = list(
        filter(lambda digital_content: digital_content["digital_content_id"] not in exclusion_list, digitalContents)
    )

    random.shuffle(filtered_digital_contents)
    return list(map(extend_digital_content, filtered_digital_contents))


def get_full_recommended_digital_contents(request, args, strategy):
    # Attempt to use the cached digitalContents list
    if args["user_id"] is not None:
        full_recommended = get_recommended_digital_contents(args, strategy)
    else:
        key = get_trending_cache_key(to_dict(request.args), request.path)
        full_recommended = use_redis_cache(
            key, TRENDING_TTL_SEC, lambda: get_recommended_digital_contents(args, strategy)
        )
    return full_recommended
