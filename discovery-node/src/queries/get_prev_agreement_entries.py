from typing import List

from sqlalchemy import and_, func, or_
from sqlalchemy.orm.session import Session
from src.models.agreements.digital_content import DigitalContent


def get_prev_digital_content_entries(session: Session, entries: List[DigitalContent]):
    """
    Gets the previous state of agreements in the database given a list of agreements.

    Args:
        session: (DB) sqlalchemy scoped db session
        entries: (List<DigitalContent>) List of current digital_content entries

    Returns:
        prev_digital_content_entries: (List<DigitalContent>) List of previous digital_content entries corresponding to the passed digital_content entries
    """

    if len(entries) == 0:
        return []

    def get_prev_query_pairs(entry):
        return [entry.digital_content_id, entry.blocknumber]

    prev_query_pairs = map(get_prev_query_pairs, entries)

    prev_entries_subquery = (
        session.query(
            DigitalContent.digital_content_id, func.max(DigitalContent.blocknumber).label("max_blocknumber")
        )
        .filter(
            or_(
                *(
                    and_(DigitalContent.digital_content_id == pair[0], DigitalContent.blocknumber < pair[1])
                    for pair in prev_query_pairs
                )
            )
        )
        .group_by(DigitalContent.digital_content_id)
        .subquery()
    )

    prev_entries_query = session.query(DigitalContent).join(
        prev_entries_subquery,
        and_(
            prev_entries_subquery.c.digital_content_id == DigitalContent.digital_content_id,
            prev_entries_subquery.c.max_blocknumber == DigitalContent.blocknumber,
        ),
    )

    return prev_entries_query.all()
