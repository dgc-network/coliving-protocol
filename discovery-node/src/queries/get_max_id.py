from sqlalchemy import func
from src import exceptions
from src.models.contentLists.contentList import ContentList
from src.models.agreements.agreement import Agreement
from src.models.users.user import User
from src.utils.db_session import get_db_read_replica


def get_max_id(type):
    if type not in ["agreement", "contentList", "user"]:
        raise exceptions.ArgumentError(
            "Invalid type provided, must be one of 'agreement', 'contentList', 'user'"
        )

    db = get_db_read_replica()
    with db.scoped_session() as session:
        if type == "agreement":
            latest = (
                session.query(func.max(Agreement.agreement_id))
                .filter(Agreement.is_unlisted == False)
                .filter(Agreement.is_current == True)
                .scalar()
            )
            return latest

        if type == "contentList":
            latest = (
                session.query(func.max(ContentList.contentList_id))
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
