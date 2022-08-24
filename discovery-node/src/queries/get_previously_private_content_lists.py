from src import exceptions
from src.models.content_lists.content_list import ContentList
from src.utils.db_session import get_db_read_replica


def get_previously_private_content_lists(args):
    db = get_db_read_replica()
    with db.scoped_session() as session:
        if "date" not in args:
            raise exceptions.ArgumentError(
                "'date' required to query for retrieving previously private content lists"
            )

        date = args.get("date")

        content_list_after_date = (
            session.query(ContentList.content_list_id, ContentList.updated_at)
            .distinct(ContentList.content_list_id)
            .filter(ContentList.is_private == False, ContentList.updated_at >= date)
            .subquery()
        )

        content_list_before_date = (
            session.query(ContentList.content_list_id, ContentList.updated_at)
            .distinct(ContentList.content_list_id)
            .filter(ContentList.is_private == True, ContentList.updated_at < date)
            .subquery()
        )

        previously_private_results = (
            session.query(content_list_before_date.c["content_list_id"])
            .join(
                content_list_after_date,
                content_list_after_date.c["content_list_id"]
                == content_list_before_date.c["content_list_id"],
            )
            .all()
        )

        content_list_ids = [result[0] for result in previously_private_results]

    return {"ids": content_list_ids}
