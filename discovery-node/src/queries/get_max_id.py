from sqlalchemy import func
from src import exceptions
from src.models.content_lists.content_list import ContentList
from src.models.digitalContents.digital_content import DigitalContent
from src.models.users.user import User
from src.utils.db_session import get_db_read_replica


def get_max_id(type):
    if type not in ["digital_content", "content_list", "user"]:
        raise exceptions.ArgumentError(
            "Invalid type provided, must be one of 'digital_content', 'contentList', 'user'"
        )

    db = get_db_read_replica()
    with db.scoped_session() as session:
        if type == "digital_content":
            latest = (
                session.query(func.max(DigitalContent.digital_content_id))
                .filter(DigitalContent.is_unlisted == False)
                .filter(DigitalContent.is_current == True)
                .scalar()
            )
            return latest

        if type == "content_list":
            latest = (
                session.query(func.max(ContentList.content_list_id))
                .filter(ContentList.is_private == False)
                .filter(ContentList.is_current == True)
                .scalar()
            )
            return latest

        # user
        latest = (
            session.query(func.max(User.user_id))
            .filter(User.is_current == True)
            .scalar()
        )
        return latest
