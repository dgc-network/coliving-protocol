import logging
from operator import or_

from src.models.users.user import User
from src.queries.query_helpers import add_query_pagination
from src.utils import helpers
from src.utils.db_session import get_db_read_replica

logger = logging.getLogger(__name__)


def get_user_history(args):
    user_id = args.get("user_id")
    limit = args.get("limit")
    offset = args.get("offset")

    db = get_db_read_replica()
    with db.scoped_session() as session:
        user_history_query = (
            session.query(User)
            .filter(
                User.user_id == user_id,
                # Or both possibilities to allow use of composite index
                # on user, block, is_current
                or_(User.is_current == True, User.is_current == False),
            )
            .order_by(User.updated_at.asc())
        )

        user_history = add_query_pagination(user_history_query, limit, offset).all()

        if not user_history:
            return None

        return helpers.query_result_to_list(user_history)
