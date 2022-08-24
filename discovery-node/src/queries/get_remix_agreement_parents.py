import logging  # pylint: disable=C0302

from flask.globals import request
from sqlalchemy import and_, desc
from src.models.agreements.remix import Remix
from src.models.agreements.agreement import Agreement
from src.queries.query_helpers import (
    add_query_pagination,
    add_users_to_agreements,
    populate_agreement_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica
from src.utils.redis_cache import extract_key, use_redis_cache

logger = logging.getLogger(__name__)

UNPOPULATED_REMIX_PARENTS_CACHE_DURATION_SEC = 10


def make_cache_key(args):
    cache_keys = {
        "limit": args.get("limit"),
        "offset": args.get("offset"),
        "agreement_id": args.get("agreement_id"),
    }
    return extract_key(f"unpopulated-remix-parents:{request.path}", cache_keys.items())


def get_remix_agreement_parents(args):
    """Fetch remix parents for a given agreement.

    Args:
        args:dict
        args.agreement_id: agreement id
        args.limit: limit
        args.offset: offset
        args.with_users: with users
        args.current_user_id: current user ID
    """
    agreement_id = args.get("agreement_id")
    current_user_id = args.get("current_user_id")
    limit = args.get("limit")
    offset = args.get("offset")
    db = get_db_read_replica()

    with db.scoped_session() as session:

        def get_unpopulated_remix_parents():
            base_query = (
                session.query(Agreement)
                .join(
                    Remix,
                    and_(
                        Remix.parent_agreement_id == Agreement.agreement_id,
                        Remix.child_agreement_id == agreement_id,
                    ),
                )
                .filter(Agreement.is_current == True, Agreement.is_unlisted == False)
                .order_by(desc(Agreement.created_at), desc(Agreement.agreement_id))
            )

            agreements = add_query_pagination(base_query, limit, offset).all()
            agreements = helpers.query_result_to_list(agreements)
            agreement_ids = list(map(lambda agreement: agreement["agreement_id"], agreements))
            return (agreements, agreement_ids)

        key = make_cache_key(args)
        (agreements, agreement_ids) = use_redis_cache(
            key,
            UNPOPULATED_REMIX_PARENTS_CACHE_DURATION_SEC,
            get_unpopulated_remix_parents,
        )

        agreements = populate_agreement_metadata(session, agreement_ids, agreements, current_user_id)
        if args.get("with_users", False):
            add_users_to_agreements(session, agreements, current_user_id)

    return agreements
