import logging  # pylint: disable=C0302

from sqlalchemy import and_
from src.models.agreements.agreement import Agreement
from src.models.users.user import User
from src.utils.db_session import get_db_read_replica

logger = logging.getLogger(__name__)


def get_agreement_user_content_node(args):
    db = get_db_read_replica()
    with db.scoped_session() as session:
        # Get the agreement's owner content node
        user = (
            session.query(User.content_node_endpoint)
            .join(
                Agreement,
                and_(
                    Agreement.owner_id == User.user_id,
                    Agreement.is_current == True,
                    Agreement.is_delete == False,
                    Agreement.is_unlisted == False,
                    Agreement.agreement_id == args.get("agreement_id"),
                ),
            )
            .filter(User.is_current)
            .first()
        )

        if not user:
            return None
        content_nodes = user[0]
        return content_nodes
