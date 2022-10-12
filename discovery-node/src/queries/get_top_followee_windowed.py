from sqlalchemy import desc, text
from src import exceptions
from src.models.social.follow import Follow
from src.models.agreements.aggregate_digital_content import AggregateAgreement
from src.models.agreements.digital_content import DigitalContent
from src.queries.query_helpers import (
    get_users_by_id,
    get_users_ids,
    populate_digital_content_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_top_followee_windowed(type, window, args):
    if type != "digital_content":
        raise exceptions.ArgumentError("Invalid type provided, must be one of 'digital_content'")

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
                DigitalContent,
            )
            .join(
                followee_user_ids_subquery,
                DigitalContent.owner_id == followee_user_ids_subquery.c.followee_user_id,
            )
            .join(AggregateAgreement, DigitalContent.digital_content_id == AggregateAgreement.digital_content_id)
            .filter(
                DigitalContent.is_current == True,
                DigitalContent.is_delete == False,
                DigitalContent.is_unlisted == False,
                DigitalContent.stem_of == None,
                # Query only agreements created `window` time ago (week, month, etc.)
                DigitalContent.created_at >= text(f"NOW() - interval '1 {window}'"),
            )
            .order_by(
                desc(AggregateAgreement.repost_count + AggregateAgreement.save_count),
                desc(DigitalContent.digital_content_id),
            )
            .limit(limit)
        )

        agreements_query_results = agreements_query.all()
        agreements = helpers.query_result_to_list(agreements_query_results)
        digital_content_ids = list(map(lambda digital_content: digital_content["digital_content_id"], agreements))

        # Bundle peripheral info into digital_content results
        agreements = populate_digital_content_metadata(session, digital_content_ids, agreements, current_user_id)

        if args.get("with_users", False):
            user_id_list = get_users_ids(agreements)
            users = get_users_by_id(session, user_id_list)
            for digital_content in agreements:
                user = users[digital_content["owner_id"]]
                if user:
                    digital_content["user"] = user

    return agreements
