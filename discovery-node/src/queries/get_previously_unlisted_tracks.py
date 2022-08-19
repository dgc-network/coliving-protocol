from src import exceptions
from src.models.agreements.agreement import Agreement
from src.utils.db_session import get_db_read_replica


def get_previously_unlisted_agreements(args):
    db = get_db_read_replica()
    with db.scoped_session() as session:
        if "date" not in args:
            raise exceptions.ArgumentError(
                "'date' required to query for retrieving previously unlisted agreements"
            )

        date = args.get("date")

        agreements_after_date = (
            session.query(Agreement.agreement_id, Agreement.updated_at)
            .distinct(Agreement.agreement_id)
            .filter(Agreement.is_unlisted == False, Agreement.updated_at >= date)
            .subquery()
        )

        agreements_before_date = (
            session.query(Agreement.agreement_id, Agreement.updated_at)
            .distinct(Agreement.agreement_id)
            .filter(Agreement.is_unlisted == True, Agreement.updated_at < date)
            .subquery()
        )

        previously_unlisted_results = (
            session.query(agreements_before_date.c["agreement_id"])
            .join(
                agreements_after_date,
                agreements_after_date.c["agreement_id"] == agreements_before_date.c["agreement_id"],
            )
            .all()
        )

        agreement_ids = [result[0] for result in previously_unlisted_results]

    return {"ids": agreement_ids}
