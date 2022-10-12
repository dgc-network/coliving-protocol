import logging
from datetime import datetime

from dateutil import parser
from src.models.agreements.digital_content import DigitalContent
from src.utils import helpers, redis_connection
from src.utils.redis_cache import (
    get_all_json_cached_key,
    get_digital_content_id_cache_key,
    set_json_cached_key,
)

logger = logging.getLogger(__name__)

# Cache unpopulated agreements for 5 min
ttl_sec = 5 * 60

digital_content_datetime_fields = []
for column in DigitalContent.__table__.c:
    if column.type.python_type == datetime:
        digital_content_datetime_fields.append(column.name)


def get_cached_digital_contents(digital_content_ids):
    redis_digital_content_id_keys = list(map(get_digital_content_id_cache_key, digital_content_ids))
    redis = redis_connection.get_redis()
    agreements = get_all_json_cached_key(redis, redis_digital_content_id_keys)
    for digital_content in agreements:
        if digital_content:
            for field in digital_content_datetime_fields:
                if digital_content[field]:
                    digital_content[field] = parser.parse(digital_content[field])
    return agreements


def set_digital_contents_in_cache(agreements):
    redis = redis_connection.get_redis()
    for digital_content in agreements:
        key = get_digital_content_id_cache_key(digital_content["digital_content_id"])
        set_json_cached_key(redis, key, digital_content, ttl_sec)


def get_unpopulated_digital_contents(
    session, digital_content_ids, filter_deleted=False, filter_unlisted=True
):
    """
    Fetches agreements by checking the redis cache first then
    going to DB and writes to cache if not present

    Args:
        session: DB session
        digital_content_ids: array A list of digital_content ids

    Returns:
        Array of agreements
    """
    # Check the cached agreements
    cached_digital_contents_results = get_cached_digital_contents(digital_content_ids)
    has_all_digital_contents_cached = cached_digital_contents_results.count(None) == 0
    if has_all_digital_contents_cached:
        res = cached_digital_contents_results
        if filter_deleted:
            res = list(filter(lambda digital_content: not digital_content["is_delete"], res))
        if filter_unlisted:
            res = list(filter(lambda digital_content: not digital_content["is_unlisted"], res))
        return res

    # Create a dict of cached agreements
    cached_digital_contents = {}
    for cached_digital_content in cached_digital_contents_results:
        if cached_digital_content:
            cached_digital_contents[cached_digital_content["digital_content_id"]] = cached_digital_content

    digital_content_ids_to_fetch = filter(
        lambda digital_content_id: digital_content_id not in cached_digital_contents, digital_content_ids
    )

    agreements_query = (
        session.query(DigitalContent)
        .filter(DigitalContent.is_current == True, DigitalContent.stem_of == None)
        .filter(DigitalContent.digital_content_id.in_(digital_content_ids_to_fetch))
    )

    if filter_unlisted:
        agreements_query = agreements_query.filter(DigitalContent.is_unlisted == False)

    if filter_deleted:
        agreements_query = agreements_query.filter(DigitalContent.is_delete == False)

    agreements = agreements_query.all()
    agreements = helpers.query_result_to_list(agreements)
    queried_digital_contents = {digital_content["digital_content_id"]: digital_content for digital_content in agreements}

    # cache agreements for future use
    set_digital_contents_in_cache(agreements)

    agreements_response = []
    for digital_content_id in digital_content_ids:
        if digital_content_id in cached_digital_contents:
            if filter_unlisted and cached_digital_contents[digital_content_id]["is_unlisted"]:
                continue
            if filter_deleted and cached_digital_contents[digital_content_id]["is_delete"]:
                continue
            agreements_response.append(cached_digital_contents[digital_content_id])
        elif digital_content_id in queried_digital_contents:
            agreements_response.append(queried_digital_contents[digital_content_id])

    return agreements_response
