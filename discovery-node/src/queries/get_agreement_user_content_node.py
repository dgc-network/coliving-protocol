import logging  # pylint: disable=C0302

from sqlalchemy import and_
from src.models.agreements.digital_content import DigitalContent
from src.models.users.user import User
from src.utils.db_session import get_db_read_replica

logger = logging.getLogger(__name__)


def get_digital_content_user_content_node(args):
    db = get_db_read_replica()
    with db.scoped_session() as session:
        # Get the digital_content's owner content node
        user = (
            session.query(User.content_node_endpoint)
            .join(
                DigitalContent,
                and_(
                    DigitalContent.owner_id == User.user_id,
                    DigitalContent.is_current == True,
                    DigitalContent.is_delete == False,
                    DigitalContent.is_unlisted == False,
                    DigitalContent.digital_content_id == args.get("digital_content_id"),
                ),
            )
            .filter(User.is_current)
            .first()
        )

        if not user:
            return None
        content_nodes = user[0]
        return content_nodes
