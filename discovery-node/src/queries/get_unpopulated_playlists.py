import logging  # pylint: disable=C0302
from datetime import datetime

from dateutil import parser
from src.models.contentLists.contentList import ContentList
from src.utils import helpers, redis_connection
from src.utils.redis_cache import (
    get_all_json_cached_key,
    get_contentList_id_cache_key,
    set_json_cached_key,
)

logger = logging.getLogger(__name__)

# Cache unpopulated contentLists for 5 min
ttl_sec = 5 * 60

contentList_datetime_fields = []
for column in ContentList.__table__.c:
    if column.type.python_type == datetime:
        contentList_datetime_fields.append(column.name)


def get_cached_contentLists(contentList_ids):
    redis_contentList_id_keys = list(map(get_contentList_id_cache_key, contentList_ids))
    redis = redis_connection.get_redis()
    contentLists = get_all_json_cached_key(redis, redis_contentList_id_keys)
    for contentList in contentLists:
        if contentList:
            for field in contentList_datetime_fields:
                if contentList[field]:
                    contentList[field] = parser.parse(contentList[field])
    return contentLists


def set_contentLists_in_cache(contentLists):
    redis = redis_connection.get_redis()
    for contentList in contentLists:
        key = get_contentList_id_cache_key(contentList["contentList_id"])
        set_json_cached_key(redis, key, contentList, ttl_sec)


def get_unpopulated_contentLists(session, contentList_ids, filter_deleted=False):
    """
    Fetches contentLists by checking the redis cache first then
    going to DB and writes to cache if not present

    Args:
        session: DB session
        contentList_ids: array A list of contentList ids

    Returns:
        Array of contentLists
    """
    # Check the cached contentLists
    cached_contentLists_results = get_cached_contentLists(contentList_ids)
    has_all_contentLists_cached = cached_contentLists_results.count(None) == 0
    if has_all_contentLists_cached:
        if filter_deleted:
            return list(
                filter(
                    lambda contentList: not contentList["is_delete"], cached_contentLists_results
                )
            )
        return cached_contentLists_results

    # Create a dict of cached contentLists
    cached_contentLists = {}
    for cached_contentList in cached_contentLists_results:
        if cached_contentList:
            cached_contentLists[cached_contentList["contentList_id"]] = cached_contentList

    contentList_ids_to_fetch = filter(
        lambda contentList_id: contentList_id not in cached_contentLists, contentList_ids
    )

    contentLists_query = (
        session.query(ContentList)
        .filter(ContentList.is_current == True)
        .filter(ContentList.contentList_id.in_(contentList_ids_to_fetch))
    )
    if filter_deleted:
        contentLists_query = contentLists_query.filter(ContentList.is_delete == False)

    contentLists = contentLists_query.all()
    contentLists = helpers.query_result_to_list(contentLists)
    queried_contentLists = {contentList["contentList_id"]: contentList for contentList in contentLists}

    # cache contentLists for future use
    set_contentLists_in_cache(contentLists)

    contentLists_response = []
    for contentList_id in contentList_ids:
        if contentList_id in cached_contentLists:
            if not filter_deleted or not cached_contentLists[contentList_id]["is_delete"]:
                contentLists_response.append(cached_contentLists[contentList_id])
        elif contentList_id in queried_contentLists:
            contentLists_response.append(queried_contentLists[contentList_id])

    return contentLists_response
