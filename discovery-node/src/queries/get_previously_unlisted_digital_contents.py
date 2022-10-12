from src import exceptions
from src.models.digitalContents.digital_content import DigitalContent
from src.utils.db_session import get_db_read_replica


def get_previously_unlisted_digital_contents(args):
    db = get_db_read_replica()
    with db.scoped_session() as session:
        if "date" not in args:
            raise exceptions.ArgumentError(
                "'date' required to query for retrieving previously unlisted digitalContents"
            )

        date = args.get("date")

        digitalContents_after_date = (
            session.query(DigitalContent.digital_content_id, DigitalContent.updated_at)
            .distinct(DigitalContent.digital_content_id)
            .filter(DigitalContent.is_unlisted == False, DigitalContent.updated_at >= date)
            .subquery()
        )

        digitalContents_before_date = (
            session.query(DigitalContent.digital_content_id, DigitalContent.updated_at)
            .distinct(DigitalContent.digital_content_id)
            .filter(DigitalContent.is_unlisted == True, DigitalContent.updated_at < date)
            .subquery()
        )

        previously_unlisted_results = (
            session.query(digitalContents_before_date.c["digital_content_id"])
            .join(
                digitalContents_after_date,
                digitalContents_after_date.c["digital_content_id"] == digitalContents_before_date.c["digital_content_id"],
            )
            .all()
        )

        digital_content_ids = [result[0] for result in previously_unlisted_results]

    return {"ids": digital_content_ids}
