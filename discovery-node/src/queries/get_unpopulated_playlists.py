import logging  # pylint: disable=C0302
from datetime import datetime

from dateutil import parser
from src.models.content lists.content list import ContentList
from src.utils import helpers, redis_connection
from src.utils.redis_cache import (
    get_all_json_cached_key,
    get_content list_id_cache_key,
    set_json_cached_key,
)

logger = logging.getLogger(__name__)

# Cache unpopulated content lists for 5 min
ttl_sec = 5 * 60

content list_datetime_fields = []
for column in ContentList.__table__.c:
    if column.type.python_type == datetime:
        content list_datetime_fields.append(column.name)


def get_cached_content lists(content list_ids):
    redis_content list_id_keys = list(map(get_content list_id_cache_key, content list_ids))
    redis = redis_connection.get_redis()
    content lists = get_all_json_cached_key(redis, redis_content list_id_keys)
    for content list in content lists:
        if content list:
            for field in content list_datetime_fields:
                if content list[field]:
                    content list[field] = parser.parse(content list[field])
    return content lists


def set_content lists_in_cache(content lists):
    redis = redis_connection.get_redis()
    for content list in content lists:
        key = get_content list_id_cache_key(content list["content list_id"])
        set_json_cached_key(redis, key, content list, ttl_sec)


def get_unpopulated_content lists(session, content list_ids, filter_deleted=False):
    """
    Fetches content lists by checking the redis cache first then
    going to DB and writes to cache if not present

    Args:
        session: DB session
        content list_ids: array A list of content list ids

    Returns:
        Array of content lists
    """
    # Check the cached content lists
    cached_content lists_results = get_cached_content lists(content list_ids)
    has_all_content lists_cached = cached_content lists_results.count(None) == 0
    if has_all_content lists_cached:
        if filter_deleted:
            return list(
                filter(
                    lambda content list: not content list["is_delete"], cached_content lists_results
                )
            )
        return cached_content lists_results

    # Create a dict of cached content lists
    cached_content lists = {}
    for cached_content list in cached_content lists_results:
        if cached_content list:
            cached_content lists[cached_content list["content list_id"]] = cached_content list

    content list_ids_to_fetch = filter(
        lambda content list_id: content list_id not in cached_content lists, content list_ids
    )

    content lists_query = (
        session.query(ContentList)
        .filter(ContentList.is_current == True)
        .filter(ContentList.content list_id.in_(content list_ids_to_fetch))
    )
    if filter_deleted:
        content lists_query = content lists_query.filter(ContentList.is_delete == False)

    content lists = content lists_query.all()
    content lists = helpers.query_result_to_list(content lists)
    queried_content lists = {content list["content list_id"]: content list for content list in content lists}

    # cache content lists for future use
    set_content lists_in_cache(content lists)

    content lists_response = []
    for content list_id in content list_ids:
        if content list_id in cached_content lists:
            if not filter_deleted or not cached_content lists[content list_id]["is_delete"]:
                content lists_response.append(cached_content lists[content list_id])
        elif content list_id in queried_content lists:
            content lists_response.append(queried_content lists[content list_id])

    return content lists_response
