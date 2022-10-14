import logging
from datetime import datetime, timezone
from typing import Any, List, Tuple, TypedDict, Union

import requests
from src.models.indexing.ursm_content_node import UrsmContentNode
from src.models.digitalContents.digital_content import DigitalContent
from src.models.users.user import User
from src.tasks.celery_app import celery
from src.utils.prometheus_metric import (
    PrometheusMetric,
    PrometheusMetricNames,
    save_duration_metric,
)
from src.utils.redis_constants import (
    ALL_UNAVAILABLE_AGREEMENTS_REDIS_KEY,
    UPDATE_DIGITAL_CONTENT_IS_AVAILABLE_FINISH_REDIS_KEY,
    UPDATE_DIGITAL_CONTENT_IS_AVAILABLE_START_REDIS_KEY,
)

logger = logging.getLogger(__name__)

UPDATE_DIGITAL_CONTENT_IS_AVAILABLE_LOCK = "update_digital_content_is_available_lock"

BATCH_SIZE = 1000
DEFAULT_LOCK_TIMEOUT_SECONDS = 30  # 30 seconds
REQUESTS_TIMEOUT_SECONDS = 300  # 5 minutes


class ContentNodeInfo(TypedDict):
    endpoint: str
    spID: int


def _get_redis_set_members_as_list(redis: Any, key: str) -> List[int]:
    """Fetches the unavailable digital_content ids per Content Node"""
    values = redis.smembers(key)
    return [int(value.decode()) for value in values]


def fetch_unavailable_digital_content_ids_in_network(session: Any, redis: Any) -> None:
    """Fetches the unavailable digital_content ids in the Content Node network"""
    content_nodes = query_registered_content_node_info(session)

    # Clear redis for existing data
    redis.delete(ALL_UNAVAILABLE_AGREEMENTS_REDIS_KEY)

    for node in content_nodes:
        # Keep mapping of spId to set of unavailable digitalContents
        unavailable_digital_content_ids = fetch_unavailable_digital_content_ids(node["endpoint"])
        spID_unavailable_digital_contents_key = get_unavailable_digital_contents_redis_key(node["spID"])

        # Clear redis for existing data
        redis.delete(spID_unavailable_digital_contents_key)

        for i in range(0, len(unavailable_digital_content_ids), BATCH_SIZE):
            unavailable_digital_content_ids_batch = unavailable_digital_content_ids[i : i + BATCH_SIZE]
            redis.sadd(spID_unavailable_digital_contents_key, *unavailable_digital_content_ids_batch)

            # Aggregate a set of unavailable digitalContents
            redis.sadd(ALL_UNAVAILABLE_AGREEMENTS_REDIS_KEY, *unavailable_digital_content_ids_batch)


def update_digital_contents_is_available_status(db: Any, redis: Any) -> None:
    """Check digital_content availability on all unavailable digitalContents and update in DigitalContents table"""
    all_unavailable_digital_content_ids = _get_redis_set_members_as_list(
        redis, ALL_UNAVAILABLE_AGREEMENTS_REDIS_KEY
    )

    for i in range(0, len(all_unavailable_digital_content_ids), BATCH_SIZE):
        unavailable_digital_content_ids_batch = all_unavailable_digital_content_ids[i : i + BATCH_SIZE]
        try:
            with db.scoped_session() as session:
                digital_content_ids_to_replica_set = query_replica_set_by_digital_content_id(
                    session, unavailable_digital_content_ids_batch
                )

                digital_content_id_to_is_available_status = {}

                for entry in digital_content_ids_to_replica_set:
                    digital_content_id = entry[0]

                    # Some users are do not have primary_ids or secondary_ids
                    # If these values are not null, check if digital_content is available
                    # Else, default to digital_content as available
                    if (
                        entry[1] is not None  # primary_id
                        and entry[2][0] is not None  # secondary_id 1
                        and entry[2][1] is not None  # secondary_id 2
                    ):

                        spID_replica_set = [entry[1], *entry[2]]
                        is_available = check_digital_content_is_available(
                            redis=redis,
                            digital_content_id=digital_content_id,
                            spID_replica_set=spID_replica_set,
                        )
                    else:
                        is_available = True

                    digital_content_id_to_is_available_status[digital_content_id] = is_available

                # Update digitalContents with is_available status
                digitalContents = query_digital_contents_by_digital_content_ids(session, unavailable_digital_content_ids_batch)
                for digital_content in digitalContents:
                    is_available = digital_content_id_to_is_available_status[digital_content.digital_content_id]

                    # If digital_content is not available, also flip 'is_delete' flag to True
                    if not is_available:
                        digital_content.is_available = False
                        digital_content.is_delete = True

        except Exception as e:
            logger.warn(
                f"update_digital_content_is_available.py | Could not process batch {unavailable_digital_content_ids_batch}: {e}\nContinuing..."
            )


def fetch_unavailable_digital_content_ids(node: str) -> List[int]:
    """Fetches unavailable digitalContents from Content Node. Returns empty list if request fails"""
    unavailable_digital_content_ids = []

    try:
        resp = requests.get(
            f"{node}/blacklist/digitalContents", timeout=REQUESTS_TIMEOUT_SECONDS
        ).json()
        unavailable_digital_content_ids = resp["data"]["values"]
    except Exception as e:
        logger.warn(
            f"update_digital_content_is_available.py | Could not fetch unavailable digitalContents from {node}: {e}"
        )

    return unavailable_digital_content_ids


def query_replica_set_by_digital_content_id(
    session: Any, digital_content_ids: List[int]
) -> Union[List[Tuple[int, int, List[int]]], List[Tuple[int, None, List[None]]]]:
    """
    Returns an array of tuples with the structure: [(digital_content_id | primary_id | secondary_ids), ...]
    If `primary_id` and `secondary_ids` are undefined, will return as None
    """
    digital_content_ids_and_replica_sets = (
        session.query(DigitalContent.digital_content_id, User.primary_id, User.secondary_ids)
        .join(User, DigitalContent.owner_id == User.user_id, isouter=True)  # left join
        .filter(
            User.is_current == True,
            DigitalContent.is_current == True,
            DigitalContent.digital_content_id.in_(digital_content_ids),
        )
        .all()
    )

    return digital_content_ids_and_replica_sets


def query_digital_contents_by_digital_content_ids(session: Any, digital_content_ids: List[int]) -> List[Any]:
    """Returns a list of DigitalContent objects that has a digital_content id in `digital_content_ids`"""
    digitalContents = (
        session.query(DigitalContent)
        .filter(
            DigitalContent.is_current == True,
            DigitalContent.digital_content_id.in_(digital_content_ids),
        )
        .all()
    )

    return digitalContents


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


def check_digital_content_is_available(
    redis: Any, digital_content_id: int, spID_replica_set: List[int]
) -> bool:
    """
    Checks if a digital_content is available in the replica set. Needs to only be available
    on one replica set node to be marked as available.
        redis: redis instance
        digital_content_id: the observed digital_content id
        spID_replica_set: an array of the SP IDs that are associated with digital_content
    """

    i = 0
    while i < len(spID_replica_set):
        spID_unavailable_digital_contents_key = get_unavailable_digital_contents_redis_key(
            spID_replica_set[i]
        )
        is_available_on_sp = not redis.sismember(spID_unavailable_digital_contents_key, digital_content_id)

        if is_available_on_sp:
            return True

        i = i + 1

    return False


def get_unavailable_digital_contents_redis_key(spID: int) -> str:
    """Returns the redis key used to store the unavailable digitalContents on a sp"""
    return f"update_digital_content_is_available:unavailable_digital_contents_{spID}"


# ####### CELERY TASKS ####### #
@celery.task(name="update_digital_content_is_available", bind=True)
@save_duration_metric(metric_group="celery_task")
def update_digital_content_is_available(self) -> None:
    """Recurring task that updates whether digitalContents are available on the network"""

    db = update_digital_content_is_available.db
    redis = update_digital_content_is_available.redis

    have_lock = False
    update_lock = redis.lock(
        UPDATE_DIGITAL_CONTENT_IS_AVAILABLE_LOCK,
        timeout=DEFAULT_LOCK_TIMEOUT_SECONDS,
    )

    have_lock = update_lock.acquire(blocking=False)
    if have_lock:
        metric = PrometheusMetric(
            PrometheusMetricNames.UPDATE_DIGITAL_CONTENT_IS_AVAILABLE_DURATION_SECONDS
        )
        try:
            # TODO: we can deprecate this manual redis timestamp tracker once we confirm
            # that prometheus works in tracking duration. Needs to be removed from
            # the health check too
            redis.set(
                UPDATE_DIGITAL_CONTENT_IS_AVAILABLE_START_REDIS_KEY,
                datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f %Z"),
            )

            with db.scoped_session() as session:
                fetch_unavailable_digital_content_ids_in_network(session, redis)

            update_digital_contents_is_available_status(db, redis)

            metric.save_time({"success": "true"})
        except Exception as e:
            metric.save_time({"success": "false"})
            logger.error(
                "update_digital_content_is_available.py | Fatal error in main loop", exc_info=True
            )
            raise e
        finally:
            # TODO: see comment above about deprecation
            redis.set(
                UPDATE_DIGITAL_CONTENT_IS_AVAILABLE_FINISH_REDIS_KEY,
                datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f %Z"),
            )
            if have_lock:
                update_lock.release()
    else:
        logger.warning(
            "update_digital_content_is_available.py | Lock not acquired",
            exc_info=True,
        )
