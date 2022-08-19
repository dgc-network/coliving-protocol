import logging  # pylint: disable=C0302

from src.models.agreements.tag_agreement_user_matview import t_tag_agreement_user
from src.models.agreements.agreement import Agreement
from src.queries import response_name_constants
from src.queries.query_helpers import get_agreement_play_counts, populate_agreement_metadata
from src.utils import helpers

logger = logging.getLogger(__name__)


def search_agreement_tags(session, args):
    """
    Gets the agreements with a given tag

    Args:
        session: sqlalchemy db session instance
        args: dict of arguments
        args.search_str: string the tag search string
        args.current_user_id: id | null The user id making the query
        args.limit: number the query limit of number of returns agreements
        args.offset: number the query offset for results

    Returns:
        list of agreements sorted by play count
    """

    agreement_ids = (
        session.query(t_tag_agreement_user.c.agreement_id)
        .filter(t_tag_agreement_user.c.tag == args["search_str"].lower())
        .all()
    )

    # agreement_ids is list of tuples - simplify to 1-D list
    agreement_ids = [i[0] for i in agreement_ids]

    agreements = (
        session.query(Agreement)
        .filter(
            Agreement.is_current == True,
            Agreement.is_delete == False,
            Agreement.is_unlisted == False,
            Agreement.stem_of == None,
            Agreement.agreement_id.in_(agreement_ids),
        )
        .all()
    )

    agreements = helpers.query_result_to_list(agreements)
    agreement_play_counts = get_agreement_play_counts(session, agreement_ids)

    agreements = populate_agreement_metadata(
        session, agreement_ids, agreements, args["current_user_id"]
    )

    for agreement in agreements:
        agreement_id = agreement["agreement_id"]
        agreement[response_name_constants.play_count] = agreement_play_counts.get(agreement_id, 0)

    play_count_sorted_agreements = sorted(
        agreements, key=lambda i: i[response_name_constants.play_count], reverse=True
    )

    # Add pagination parameters to agreement and user results
    play_count_sorted_agreements = play_count_sorted_agreements[
        slice(args["offset"], args["offset"] + args["limit"], 1)
    ]

    return play_count_sorted_agreements
