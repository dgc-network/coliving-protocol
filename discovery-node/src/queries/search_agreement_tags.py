import logging  # pylint: disable=C0302

from src.models.agreements.tag_digital_content_user_matview import t_tag_digital_content_user
from src.models.agreements.digital_content import DigitalContent
from src.queries import response_name_constants
from src.queries.query_helpers import get_digital_content_play_counts, populate_digital_content_metadata
from src.utils import helpers

logger = logging.getLogger(__name__)


def search_digital_content_tags(session, args):
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

    digital_content_ids = (
        session.query(t_tag_digital_content_user.c.digital_content_id)
        .filter(t_tag_digital_content_user.c.tag == args["search_str"].lower())
        .all()
    )

    # digital_content_ids is list of tuples - simplify to 1-D list
    digital_content_ids = [i[0] for i in digital_content_ids]

    agreements = (
        session.query(DigitalContent)
        .filter(
            DigitalContent.is_current == True,
            DigitalContent.is_delete == False,
            DigitalContent.is_unlisted == False,
            DigitalContent.stem_of == None,
            DigitalContent.digital_content_id.in_(digital_content_ids),
        )
        .all()
    )

    agreements = helpers.query_result_to_list(agreements)
    digital_content_play_counts = get_digital_content_play_counts(session, digital_content_ids)

    agreements = populate_digital_content_metadata(
        session, digital_content_ids, agreements, args["current_user_id"]
    )

    for digital_content in agreements:
        digital_content_id = digital_content["digital_content_id"]
        digital_content[response_name_constants.play_count] = digital_content_play_counts.get(digital_content_id, 0)

    play_count_sorted_digital_contents = sorted(
        agreements, key=lambda i: i[response_name_constants.play_count], reverse=True
    )

    # Add pagination parameters to digital_content and user results
    play_count_sorted_digital_contents = play_count_sorted_digital_contents[
        slice(args["offset"], args["offset"] + args["limit"], 1)
    ]

    return play_count_sorted_digital_contents
