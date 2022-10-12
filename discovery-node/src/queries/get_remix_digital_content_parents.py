import logging  # pylint: disable=C0302

from flask.globals import request
from sqlalchemy import and_, desc
from src.models.digitalContents.remix import Remix
from src.models.digitalContents.digital_content import DigitalContent
from src.queries.query_helpers import (
    add_query_pagination,
    add_users_to_digital_contents,
    populate_digital_content_metadata,
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
        "digital_content_id": args.get("digital_content_id"),
    }
    return extract_key(f"unpopulated-remix-parents:{request.path}", cache_keys.items())


def get_remix_digital_content_parents(args):
    """Fetch remix parents for a given digital_content.

    Args:
        args:dict
        args.digital_content_id: digital_content id
        args.limit: limit
        args.offset: offset
        args.with_users: with users
        args.current_user_id: current user ID
    """
    digital_content_id = args.get("digital_content_id")
    current_user_id = args.get("current_user_id")
    limit = args.get("limit")
    offset = args.get("offset")
    db = get_db_read_replica()

    with db.scoped_session() as session:

        def get_unpopulated_remix_parents():
            base_query = (
                session.query(DigitalContent)
                .join(
                    Remix,
                    and_(
                        Remix.parent_digital_content_id == DigitalContent.digital_content_id,
                        Remix.child_digital_content_id == digital_content_id,
                    ),
                )
                .filter(DigitalContent.is_current == True, DigitalContent.is_unlisted == False)
                .order_by(desc(DigitalContent.created_at), desc(DigitalContent.digital_content_id))
            )

            digitalContents = add_query_pagination(base_query, limit, offset).all()
            digitalContents = helpers.query_result_to_list(digitalContents)
            digital_content_ids = list(map(lambda digital_content: digital_content["digital_content_id"], digitalContents))
            return (digitalContents, digital_content_ids)

        key = make_cache_key(args)
        (digitalContents, digital_content_ids) = use_redis_cache(
            key,
            UNPOPULATED_REMIX_PARENTS_CACHE_DURATION_SEC,
            get_unpopulated_remix_parents,
        )

        digitalContents = populate_digital_content_metadata(session, digital_content_ids, digitalContents, current_user_id)
        if args.get("with_users", False):
            add_users_to_digital_contents(session, digitalContents, current_user_id)

    return digitalContents
