import logging  # pylint: disable=C0302
import random

from src.api.v1.helpers import extend_agreement, to_dict
from src.queries.get_trending_agreements import TRENDING_TTL_SEC, get_trending_agreements
from src.utils.helpers import decode_string_id
from src.utils.redis_cache import get_trending_cache_key, use_redis_cache

logger = logging.getLogger(__name__)

DEFAULT_RECOMMENDED_LIMIT = 10


def get_recommended_agreements(args, strategy):
    """Gets recommended agreements from trending by getting the currently cached agreements and then populating them."""
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

    agreements = get_trending_agreements(args, strategy)
    filtered_agreements = list(
        filter(lambda agreement: agreement["agreement_id"] not in exclusion_list, agreements)
    )

    random.shuffle(filtered_agreements)
    return list(map(extend_agreement, filtered_agreements))


def get_full_recommended_agreements(request, args, strategy):
    # Attempt to use the cached agreements list
    if args["user_id"] is not None:
        full_recommended = get_recommended_agreements(args, strategy)
    else:
        key = get_trending_cache_key(to_dict(request.args), request.path)
        full_recommended = use_redis_cache(
            key, TRENDING_TTL_SEC, lambda: get_recommended_agreements(args, strategy)
        )
    return full_recommended
