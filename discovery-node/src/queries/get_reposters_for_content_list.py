from sqlalchemy import desc, func
from src import exceptions
from src.models.content_lists.content_list import ContentList
from src.models.social.repost import Repost, RepostType
from src.models.users.aggregate_user import AggregateUser
from src.models.users.user import User
from src.queries import response_name_constants
from src.queries.query_helpers import add_query_pagination, populate_user_metadata
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_reposters_for_content_list(args):
    user_results = []
    current_user_id = args.get("current_user_id")
    repost_content_list_id = args.get("repost_content_list_id")
    limit = args.get("limit")
    offset = args.get("offset")

    db = get_db_read_replica()
    with db.scoped_session() as session:
        # Ensure ContentList exists for provided repost_content_list_id.
        content_list_entry = (
            session.query(ContentList)
            .filter(
                ContentList.content_list_id == repost_content_list_id, ContentList.is_current == True
            )
            .first()
        )
        if content_list_entry is None:
            raise exceptions.NotFoundError(
                "Resource not found for provided contentList id"
            )

        # Get all Users that reposted ContentList, ordered by follower_count desc & paginated.
        query = (
            session.query(
                User,
                # Replace null values from left outer join with 0 to ensure sort works correctly.
                (func.coalesce(AggregateUser.follower_count, 0)).label(
                    response_name_constants.follower_count
                ),
            )
            # Left outer join to associate users with their follower count.
            .outerjoin(AggregateUser, AggregateUser.user_id == User.user_id)
            .filter(
                User.is_current == True,
                # Only select users that reposted given contentList.
                User.user_id.in_(
                    session.query(Repost.user_id).filter(
                        Repost.repost_item_id == repost_content_list_id,
                        # Select Reposts for ContentLists and Albums (i.e. not Agreements).
                        Repost.repost_type != RepostType.digital_content,
                        Repost.is_current == True,
                        Repost.is_delete == False,
                    )
                ),
            )
            .order_by(desc(response_name_constants.follower_count))
        )
        user_results = add_query_pagination(query, limit, offset).all()

        # Fix format to return only Users objects with follower_count field.
        if user_results:
            users, _ = zip(*user_results)
            user_results = helpers.query_result_to_list(users)
            # bundle peripheral info into user results
            user_ids = [user["user_id"] for user in user_results]
            user_results = populate_user_metadata(
                session, user_ids, user_results, current_user_id
            )

    return user_results
