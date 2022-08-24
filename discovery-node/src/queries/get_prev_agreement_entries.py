from typing import List

from sqlalchemy import and_, func, or_
from sqlalchemy.orm.session import Session
from src.models.agreements.agreement import Agreement


def get_prev_agreement_entries(session: Session, entries: List[Agreement]):
    """
    Gets the previous state of agreements in the database given a list of agreements.

    Args:
        session: (DB) sqlalchemy scoped db session
        entries: (List<Agreement>) List of current agreement entries

    Returns:
        prev_agreement_entries: (List<Agreement>) List of previous agreement entries corresponding to the passed agreement entries
    """

    if len(entries) == 0:
        return []

    def get_prev_query_pairs(entry):
        return [entry.agreement_id, entry.blocknumber]

    prev_query_pairs = map(get_prev_query_pairs, entries)

    prev_entries_subquery = (
        session.query(
            Agreement.agreement_id, func.max(Agreement.blocknumber).label("max_blocknumber")
        )
        .filter(
            or_(
                *(
                    and_(Agreement.agreement_id == pair[0], Agreement.blocknumber < pair[1])
                    for pair in prev_query_pairs
                )
            )
        )
        .group_by(Agreement.agreement_id)
        .subquery()
    )

    prev_entries_query = session.query(Agreement).join(
        prev_entries_subquery,
        and_(
            prev_entries_subquery.c.agreement_id == Agreement.agreement_id,
            prev_entries_subquery.c.max_blocknumber == Agreement.blocknumber,
        ),
    )

    return prev_entries_query.all()
