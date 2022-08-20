from src import exceptions
from src.models.contentLists.contentList import ContentList
from src.utils.db_session import get_db_read_replica


def get_previously_private_contentLists(args):
    db = get_db_read_replica()
    with db.scoped_session() as session:
        if "date" not in args:
            raise exceptions.ArgumentError(
                "'date' required to query for retrieving previously private contentLists"
            )

        date = args.get("date")

        contentList_after_date = (
            session.query(ContentList.contentList_id, ContentList.updated_at)
            .distinct(ContentList.contentList_id)
            .filter(ContentList.is_private == False, ContentList.updated_at >= date)
            .subquery()
        )

        contentList_before_date = (
            session.query(ContentList.contentList_id, ContentList.updated_at)
            .distinct(ContentList.contentList_id)
            .filter(ContentList.is_private == True, ContentList.updated_at < date)
            .subquery()
        )

        previously_private_results = (
            session.query(contentList_before_date.c["contentList_id"])
            .join(
                contentList_after_date,
                contentList_after_date.c["contentList_id"]
                == contentList_before_date.c["contentList_id"],
            )
            .all()
        )

        contentList_ids = [result[0] for result in previously_private_results]

    return {"ids": contentList_ids}
