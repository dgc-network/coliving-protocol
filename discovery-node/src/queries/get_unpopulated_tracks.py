import logging
from datetime import datetime

from dateutil import parser
from src.models.agreements.agreement import Agreement
from src.utils import helpers, redis_connection
from src.utils.redis_cache import (
    get_all_json_cached_key,
    get_agreement_id_cache_key,
    set_json_cached_key,
)

logger = logging.getLogger(__name__)

# Cache unpopulated agreements for 5 min
ttl_sec = 5 * 60

agreement_datetime_fields = []
for column in Agreement.__table__.c:
    if column.type.python_type == datetime:
        agreement_datetime_fields.append(column.name)


def get_cached_agreements(agreement_ids):
    redis_agreement_id_keys = list(map(get_agreement_id_cache_key, agreement_ids))
    redis = redis_connection.get_redis()
    agreements = get_all_json_cached_key(redis, redis_agreement_id_keys)
    for agreement in agreements:
        if agreement:
            for field in agreement_datetime_fields:
                if agreement[field]:
                    agreement[field] = parser.parse(agreement[field])
    return agreements


def set_agreements_in_cache(agreements):
    redis = redis_connection.get_redis()
    for agreement in agreements:
        key = get_agreement_id_cache_key(agreement["agreement_id"])
        set_json_cached_key(redis, key, agreement, ttl_sec)


def get_unpopulated_agreements(
    session, agreement_ids, filter_deleted=False, filter_unlisted=True
):
    """
    Fetches agreements by checking the redis cache first then
    going to DB and writes to cache if not present

    Args:
        session: DB session
        agreement_ids: array A list of agreement ids

    Returns:
        Array of agreements
    """
    # Check the cached agreements
    cached_agreements_results = get_cached_agreements(agreement_ids)
    has_all_agreements_cached = cached_agreements_results.count(None) == 0
    if has_all_agreements_cached:
        res = cached_agreements_results
        if filter_deleted:
            res = list(filter(lambda agreement: not agreement["is_delete"], res))
        if filter_unlisted:
            res = list(filter(lambda agreement: not agreement["is_unlisted"], res))
        return res

    # Create a dict of cached agreements
    cached_agreements = {}
    for cached_agreement in cached_agreements_results:
        if cached_agreement:
            cached_agreements[cached_agreement["agreement_id"]] = cached_agreement

    agreement_ids_to_fetch = filter(
        lambda agreement_id: agreement_id not in cached_agreements, agreement_ids
    )

    agreements_query = (
        session.query(Agreement)
        .filter(Agreement.is_current == True, Agreement.stem_of == None)
        .filter(Agreement.agreement_id.in_(agreement_ids_to_fetch))
    )

    if filter_unlisted:
        agreements_query = agreements_query.filter(Agreement.is_unlisted == False)

    if filter_deleted:
        agreements_query = agreements_query.filter(Agreement.is_delete == False)

    agreements = agreements_query.all()
    agreements = helpers.query_result_to_list(agreements)
    queried_agreements = {agreement["agreement_id"]: agreement for agreement in agreements}

    # cache agreements for future use
    set_agreements_in_cache(agreements)

    agreements_response = []
    for agreement_id in agreement_ids:
        if agreement_id in cached_agreements:
            if filter_unlisted and cached_agreements[agreement_id]["is_unlisted"]:
                continue
            if filter_deleted and cached_agreements[agreement_id]["is_delete"]:
                continue
            agreements_response.append(cached_agreements[agreement_id])
        elif agreement_id in queried_agreements:
            agreements_response.append(queried_agreements[agreement_id])

    return agreements_response
