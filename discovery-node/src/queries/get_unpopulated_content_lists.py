import logging  # pylint: disable=C0302
from datetime import datetime

from dateutil import parser
from src.models.content_lists.content_list import ContentList
from src.utils import helpers, redis_connection
from src.utils.redis_cache import (
    get_all_json_cached_key,
    get_content_list_id_cache_key,
    set_json_cached_key,
)

logger = logging.getLogger(__name__)

# Cache unpopulated contentLists for 5 min
ttl_sec = 5 * 60

content_list_datetime_fields = []
for column in ContentList.__table__.c:
    if column.type.python_type == datetime:
        content_list_datetime_fields.append(column.name)


def get_cached_content_lists(content_list_ids):
    redis_content_list_id_keys = list(map(get_content_list_id_cache_key, content_list_ids))
    redis = redis_connection.get_redis()
    contentLists = get_all_json_cached_key(redis, redis_content_list_id_keys)
    for contentList in contentLists:
        if contentList:
            for field in content_list_datetime_fields:
                if contentList[field]:
                    contentList[field] = parser.parse(contentList[field])
    return contentLists


def set_content_lists_in_cache(contentLists):
    redis = redis_connection.get_redis()
    for contentList in contentLists:
        key = get_content_list_id_cache_key(contentList["content_list_id"])
        set_json_cached_key(redis, key, contentList, ttl_sec)


def get_unpopulated_content_lists(session, content_list_ids, filter_deleted=False):
    """
    Fetches contentLists by checking the redis cache first then
    going to DB and writes to cache if not present

    Args:
        session: DB session
        content_list_ids: array A list of contentList ids

    Returns:
        Array of contentLists
    """
    # Check the cached contentLists
    cached_content_lists_results = get_cached_content_lists(content_list_ids)
    has_all_content_lists_cached = cached_content_lists_results.count(None) == 0
    if has_all_content_lists_cached:
        if filter_deleted:
            return list(
                filter(
                    lambda contentList: not contentList["is_delete"], cached_content_lists_results
                )
            )
        return cached_content_lists_results

    # Create a dict of cached contentLists
    cached_content_lists = {}
    for cached_content_list in cached_content_lists_results:
        if cached_content_list:
            cached_content_lists[cached_content_list["content_list_id"]] = cached_content_list

    content_list_ids_to_fetch = filter(
        lambda content_list_id: content_list_id not in cached_content_lists, content_list_ids
    )

    content_lists_query = (
        session.query(ContentList)
        .filter(ContentList.is_current == True)
        .filter(ContentList.content_list_id.in_(content_list_ids_to_fetch))
    )
    if filter_deleted:
        content_lists_query = content_lists_query.filter(ContentList.is_delete == False)

    contentLists = content_lists_query.all()
    contentLists = helpers.query_result_to_list(contentLists)
    queried_content_lists = {contentList["content_list_id"]: contentList for contentList in contentLists}

    # cache contentLists for future use
    set_content_lists_in_cache(contentLists)

    content_lists_response = []
    for content_list_id in content_list_ids:
        if content_list_id in cached_content_lists:
            if not filter_deleted or not cached_content_lists[content_list_id]["is_delete"]:
                content_lists_response.append(cached_content_lists[content_list_id])
        elif content_list_id in queried_content_lists:
            content_lists_response.append(queried_content_lists[content_list_id])

    return content_lists_response
