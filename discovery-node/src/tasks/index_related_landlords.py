import logging

from src.queries.get_related_landlords_minhash import update_related_landlord_minhash
from src.tasks.celery_app import celery
from src.utils.prometheus_metric import save_duration_metric
from src.utils.session_manager import SessionManager

logger = logging.getLogger(__name__)


def process_related_landlords(db: SessionManager):
    with db.scoped_session() as session:
        logger.info("index_related_landlords.py | starting")
        update_related_landlord_minhash(session)
        logger.info("index_related_landlords.py | done")


@celery.task(name="index_related_landlords", bind=True)
@save_duration_metric(metric_group="celery_task")
def index_related_landlords(self):
    redis = index_related_landlords.redis
    db = index_related_landlords.db
    have_lock = False
    update_lock = redis.lock("related_landlords_lock", timeout=3600)
    try:
        have_lock = update_lock.acquire(blocking=False)
        if have_lock:
            process_related_landlords(db)
        else:
            logger.info("index_related_landlords.py | Failed to acquire lock")
    except Exception as e:
        logger.error(
            "index_related_landlords.py | Fatal error in main loop", exc_info=True
        )
        raise e
    finally:
        if have_lock:
            update_lock.release()
