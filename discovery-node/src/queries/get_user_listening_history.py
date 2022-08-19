from typing import TypedDict

from sqlalchemy.orm.session import Session
from src.models.agreements.agreement import Agreement
from src.models.users.user_listening_history import UserListeningHistory
from src.queries import response_name_constants
from src.queries.query_helpers import add_users_to_agreements, populate_agreement_metadata
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

    agreement_ids = []
    listen_dates = []
    for listen in listening_history_results:
        agreement_ids.append(listen["agreement_id"])
        listen_dates.append(listen["timestamp"])

    agreement_results = (session.query(Agreement).filter(Agreement.agreement_id.in_(agreement_ids))).all()

    agreement_results_dict = {
        agreement_result.agreement_id: agreement_result for agreement_result in agreement_results
    }

    # sort agreements in listening history order
    sorted_agreement_results = []
    for agreement_id in agreement_ids:
        if agreement_id in agreement_results_dict:
            sorted_agreement_results.append(agreement_results_dict[agreement_id])

    agreements = helpers.query_result_to_list(sorted_agreement_results)

    # bundle peripheral info into agreement results
    agreements = populate_agreement_metadata(session, agreement_ids, agreements, current_user_id)
    add_users_to_agreements(session, agreements, current_user_id)

    for idx, agreement in enumerate(agreements):
        agreement[response_name_constants.activity_timestamp] = listen_dates[idx]

    return agreements
