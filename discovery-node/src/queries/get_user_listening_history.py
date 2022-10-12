from typing import TypedDict

from sqlalchemy.orm.session import Session
from src.models.agreements.digital_content import DigitalContent
from src.models.users.user_listening_history import UserListeningHistory
from src.queries import response_name_constants
from src.queries.query_helpers import add_users_to_digital_contents, populate_digital_content_metadata
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


class GetUserListeningHistoryArgs(TypedDict):
    # The current user logged in (from route param)
    user_id: int

    # The current user logged in (from query arg)
    current_user_id: int

    # The maximum number of listens to return
    limit: int

    # The offset for the listen history
    offset: int


def get_user_listening_history(args: GetUserListeningHistoryArgs):
    """
    Returns a user's listening history

    Args:
        args: GetUserListeningHistoryArgs The parsed args from the request

    Returns:
        Array of agreements the user listened to starting from most recently listened
    """

    db = get_db_read_replica()
    with db.scoped_session() as session:
        return _get_user_listening_history(session, args)


def _get_user_listening_history(session: Session, args: GetUserListeningHistoryArgs):
    user_id = args["user_id"]
    current_user_id = args["current_user_id"]
    limit = args["limit"]
    offset = args["offset"]

    if user_id != current_user_id:
        return []

    listening_history_results = (
        session.query(UserListeningHistory.listening_history).filter(
            UserListeningHistory.user_id == current_user_id
        )
    ).scalar()

    if not listening_history_results:
        return []

    # add query pagination
    listening_history_results = listening_history_results[offset : offset + limit]

    digital_content_ids = []
    listen_dates = []
    for listen in listening_history_results:
        digital_content_ids.append(listen["digital_content_id"])
        listen_dates.append(listen["timestamp"])

    digital_content_results = (session.query(DigitalContent).filter(DigitalContent.digital_content_id.in_(digital_content_ids))).all()

    digital_content_results_dict = {
        digital_content_result.digital_content_id: digital_content_result for digital_content_result in digital_content_results
    }

    # sort agreements in listening history order
    sorted_digital_content_results = []
    for digital_content_id in digital_content_ids:
        if digital_content_id in digital_content_results_dict:
            sorted_digital_content_results.append(digital_content_results_dict[digital_content_id])

    agreements = helpers.query_result_to_list(sorted_digital_content_results)

    # bundle peripheral info into digital_content results
    agreements = populate_digital_content_metadata(session, digital_content_ids, agreements, current_user_id)
    add_users_to_digital_contents(session, agreements, current_user_id)

    for idx, digital_content in enumerate(agreements):
        digital_content[response_name_constants.activity_timestamp] = listen_dates[idx]

    return agreements
