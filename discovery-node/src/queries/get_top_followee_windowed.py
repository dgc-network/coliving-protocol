from sqlalchemy import desc, text
from src import exceptions
from src.models.social.follow import Follow
from src.models.agreements.aggregate_agreement import AggregateAgreement
from src.models.agreements.agreement import Agreement
from src.queries.query_helpers import (
    get_users_by_id,
    get_users_ids,
    populate_agreement_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_top_followee_windowed(type, window, args):
    if type != "agreement":
        raise exceptions.ArgumentError("Invalid type provided, must be one of 'agreement'")

    valid_windows = ["week", "month", "year"]
    if not window or window not in valid_windows:
        raise exceptions.ArgumentError(
            f"Invalid window provided, must be one of {valid_windows}"
        )

    limit = args.get("limit", 25)

    current_user_id = args.get("user_id")
    db = get_db_read_replica()
    with db.scoped_session() as session:

        followee_user_ids = session.query(Follow.followee_user_id).filter(
            Follow.follower_user_id == current_user_id,
            Follow.is_current == True,
            Follow.is_delete == False,
        )
        followee_user_ids_subquery = followee_user_ids.subquery()

        # Queries for agreements joined against followed users and counts
        agreements_query = (
            session.query(
                Agreement,
            )
            .join(
                followee_user_ids_subquery,
                Agreement.owner_id == followee_user_ids_subquery.c.followee_user_id,
            )
            .join(AggregateAgreement, Agreement.agreement_id == AggregateAgreement.agreement_id)
            .filter(
                Agreement.is_current == True,
                Agreement.is_delete == False,
                Agreement.is_unlisted == False,
                Agreement.stem_of == None,
                # Query only agreements created `window` time ago (week, month, etc.)
                Agreement.created_at >= text(f"NOW() - interval '1 {window}'"),
            )
            .order_by(
                desc(AggregateAgreement.repost_count + AggregateAgreement.save_count),
                desc(Agreement.agreement_id),
            )
            .limit(limit)
        )

        agreements_query_results = agreements_query.all()
        agreements = helpers.query_result_to_list(agreements_query_results)
        agreement_ids = list(map(lambda agreement: agreement["agreement_id"], agreements))

        # Bundle peripheral info into agreement results
        agreements = populate_agreement_metadata(session, agreement_ids, agreements, current_user_id)

        if args.get("with_users", False):
            user_id_list = get_users_ids(agreements)
            users = get_users_by_id(session, user_id_list)
            for agreement in agreements:
                user = users[agreement["owner_id"]]
                if user:
                    agreement["user"] = user

    return agreements
