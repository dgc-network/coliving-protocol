import logging
from datetime import datetime, timezone
from typing import Any, List, Tuple, TypedDict, Union

import requests
from src.models.indexing.ursm_content_node import UrsmContentNode
from src.models.agreements.agreement import Agreement
from src.models.users.user import User
from src.tasks.celery_app import celery
from src.utils.prometheus_metric import (
    PrometheusMetric,
    PrometheusMetricNames,
    save_duration_metric,
)
from src.utils.redis_constants import (
    ALL_UNAVAILABLE_AGREEMENTS_REDIS_KEY,
    UPDATE_AGREEMENT_IS_AVAILABLE_FINISH_REDIS_KEY,
    UPDATE_AGREEMENT_IS_AVAILABLE_START_REDIS_KEY,
)

logger = logging.getLogger(__name__)

UPDATE_AGREEMENT_IS_AVAILABLE_LOCK = "update_agreement_is_available_lock"

BATCH_SIZE = 1000
DEFAULT_LOCK_TIMEOUT_SECONDS = 30  # 30 seconds
REQUESTS_TIMEOUT_SECONDS = 300  # 5 minutes


class ContentNodeInfo(TypedDict):
    endpoint: str
    spID: int


def _get_redis_set_members_as_list(redis: Any, key: str) -> List[int]:
    """Fetches the unavailable agreement ids per Content Node"""
    values = redis.smembers(key)
    return [int(value.decode()) for value in values]


def fetch_unavailable_agreement_ids_in_network(session: Any, redis: Any) -> None:
    """Fetches the unavailable agreement ids in the Content Node network"""
    content_nodes = query_registered_content_node_info(session)

    # Clear redis for existing data
    redis.delete(ALL_UNAVAILABLE_AGREEMENTS_REDIS_KEY)

    for node in content_nodes:
        # Keep mapping of spId to set of unavailable agreements
        unavailable_agreement_ids = fetch_unavailable_agreement_ids(node["endpoint"])
        spID_unavailable_agreements_key = get_unavailable_agreements_redis_key(node["spID"])

        # Clear redis for existing data
        redis.delete(spID_unavailable_agreements_key)

        for i in range(0, len(unavailable_agreement_ids), BATCH_SIZE):
            unavailable_agreement_ids_batch = unavailable_agreement_ids[i : i + BATCH_SIZE]
            redis.sadd(spID_unavailable_agreements_key, *unavailable_agreement_ids_batch)

            # Aggregate a set of unavailable agreements
            redis.sadd(ALL_UNAVAILABLE_AGREEMENTS_REDIS_KEY, *unavailable_agreement_ids_batch)


def update_agreements_is_available_status(db: Any, redis: Any) -> None:
    """Check agreement availability on all unavailable agreements and update in Agreements table"""
    all_unavailable_agreement_ids = _get_redis_set_members_as_list(
        redis, ALL_UNAVAILABLE_AGREEMENTS_REDIS_KEY
    )

    for i in range(0, len(all_unavailable_agreement_ids), BATCH_SIZE):
        unavailable_agreement_ids_batch = all_unavailable_agreement_ids[i : i + BATCH_SIZE]
        try:
            with db.scoped_session() as session:
                agreement_ids_to_replica_set = query_replica_set_by_agreement_id(
                    session, unavailable_agreement_ids_batch
                )

                agreement_id_to_is_available_status = {}

                for entry in agreement_ids_to_replica_set:
                    agreement_id = entry[0]

                    # Some users are do not have primary_ids or secondary_ids
                    # If these values are not null, check if agreement is available
                    # Else, default to agreement as available
                    if (
                        entry[1] is not None  # primary_id
                        and entry[2][0] is not None  # secondary_id 1
                        and entry[2][1] is not None  # secondary_id 2
                    ):

                        spID_replica_set = [entry[1], *entry[2]]
                        is_available = check_agreement_is_available(
                            redis=redis,
                            agreement_id=agreement_id,
                            spID_replica_set=spID_replica_set,
                        )
                    else:
                        is_available = True

                    agreement_id_to_is_available_status[agreement_id] = is_available

                # Update agreements with is_available status
                agreements = query_agreements_by_agreement_ids(session, unavailable_agreement_ids_batch)
                for agreement in agreements:
                    is_available = agreement_id_to_is_available_status[agreement.agreement_id]

                    # If agreement is not available, also flip 'is_delete' flag to True
                    if not is_available:
                        agreement.is_available = False
                        agreement.is_delete = True

        except Exception as e:
            logger.warn(
                f"update_agreement_is_available.py | Could not process batch {unavailable_agreement_ids_batch}: {e}\nContinuing..."
            )


def fetch_unavailable_agreement_ids(node: str) -> List[int]:
    """Fetches unavailable agreements from Content Node. Returns empty list if request fails"""
    unavailable_agreement_ids = []

    try:
        resp = requests.get(
            f"{node}/blacklist/agreements", timeout=REQUESTS_TIMEOUT_SECONDS
        ).json()
        unavailable_agreement_ids = resp["data"]["values"]
    except Exception as e:
        logger.warn(
            f"update_agreement_is_available.py | Could not fetch unavailable agreements from {node}: {e}"
        )

    return unavailable_agreement_ids


def query_replica_set_by_agreement_id(
    session: Any, agreement_ids: List[int]
) -> Union[List[Tuple[int, int, List[int]]], List[Tuple[int, None, List[None]]]]:
    """
    Returns an array of tuples with the structure: [(agreement_id | primary_id | secondary_ids), ...]
    If `primary_id` and `secondary_ids` are undefined, will return as None
    """
    agreement_ids_and_replica_sets = (
        session.query(Agreement.agreement_id, User.primary_id, User.secondary_ids)
        .join(User, Agreement.owner_id == User.user_id, isouter=True)  # left join
        .filter(
            User.is_current == True,
            Agreement.is_current == True,
            Agreement.agreement_id.in_(agreement_ids),
        )
        .all()
    )

    return agreement_ids_and_replica_sets


def query_agreements_by_agreement_ids(session: Any, agreement_ids: List[int]) -> List[Any]:
    """Returns a list of Agreement objects that has a agreement id in `agreement_ids`"""
    agreements = (
        session.query(Agreement)
        .filter(
            Agreement.is_current == True,
            Agreement.agreement_id.in_(agreement_ids),
        )
        .all()
    )

    return agreements


def query_registered_content_node_info(
    session: Any,
) -> List[ContentNodeInfo]:
    """Returns a list of all registered Content Node endpoint and spID"""
    registered_content_nodes = (
        session.query(UrsmContentNode.endpoint, UrsmContentNode.cnode_sp_id)
        .filter(
            UrsmContentNode.is_current == True,
        )
        .all()
    )

    def create_node_info_response(node):
        return {"endpoint": node[0], "spID": node[1]}

    return list(map(create_node_info_response, registered_content_nodes))


def check_agreement_is_available(
    redis: Any, agreement_id: int, spID_replica_set: List[int]
) -> bool:
    """
    Checks if a agreement is available in the replica set. Needs to only be available
    on one replica set node to be marked as available.
        redis: redis instance
        agreement_id: the observed agreement id
        spID_replica_set: an array of the SP IDs that are associated with agreement
    """

    i = 0
    while i < len(spID_replica_set):
        spID_unavailable_agreements_key = get_unavailable_agreements_redis_key(
            spID_replica_set[i]
        )
        is_available_on_sp = not redis.sismember(spID_unavailable_agreements_key, agreement_id)

        if is_available_on_sp:
            return True

        i = i + 1

    return False


def get_unavailable_agreements_redis_key(spID: int) -> str:
    """Returns the redis key used to store the unavailable agreements on a sp"""
    return f"update_agreement_is_available:unavailable_agreements_{spID}"


# ####### CELERY TASKS ####### #
@celery.task(name="update_agreement_is_available", bind=True)
@save_duration_metric(metric_group="celery_task")
def update_agreement_is_available(self) -> None:
    """Recurring task that updates whether agreements are available on the network"""

    db = update_agreement_is_available.db
    redis = update_agreement_is_available.redis

    have_lock = False
    update_lock = redis.lock(
        UPDATE_AGREEMENT_IS_AVAILABLE_LOCK,
        timeout=DEFAULT_LOCK_TIMEOUT_SECONDS,
    )

    have_lock = update_lock.acquire(blocking=False)
    if have_lock:
        metric = PrometheusMetric(
            PrometheusMetricNames.UPDATE_AGREEMENT_IS_AVAILABLE_DURATION_SECONDS
        )
        try:
            # TODO: we can deprecate this manual redis timestamp tracker once we confirm
            # that prometheus works in tracking duration. Needs to be removed from
            # the health check too
            redis.set(
                UPDATE_AGREEMENT_IS_AVAILABLE_START_REDIS_KEY,
                datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f %Z"),
            )

            with db.scoped_session() as session:
                fetch_unavailable_agreement_ids_in_network(session, redis)

            update_agreements_is_available_status(db, redis)

            metric.save_time({"success": "true"})
        except Exception as e:
            metric.save_time({"success": "false"})
            logger.error(
                "update_agreement_is_available.py | Fatal error in main loop", exc_info=True
            )
            raise e
        finally:
            # TODO: see comment above about deprecation
            redis.set(
                UPDATE_AGREEMENT_IS_AVAILABLE_FINISH_REDIS_KEY,
                datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f %Z"),
            )
            if have_lock:
                update_lock.release()
    else:
        logger.warning(
            "update_agreement_is_available.py | Lock not acquired",
            exc_info=True,
        )
