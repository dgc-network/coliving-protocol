from src import exceptions
from src.models.social.follow import Follow
from src.models.social.repost import Repost, RepostType
from src.models.agreements.digital_content import DigitalContent
from src.models.users.user import User
from src.queries.query_helpers import paginate_query
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_digital_content_repost_intersection_users(repost_digital_content_id, follower_user_id):
    users = []
    db = get_db_read_replica()
    with db.scoped_session() as session:
        # ensure digital_content_id exists
        digital_content_entry = (
            session.query(DigitalContent)
            .filter(DigitalContent.digital_content_id == repost_digital_content_id, DigitalContent.is_current == True)
            .first()
        )
        if digital_content_entry is None:
            raise exceptions.NotFoundError("Resource not found for provided digital_content id")

        query = session.query(User).filter(
            User.is_current == True,
            User.user_id.in_(
                session.query(Repost.user_id)
                .filter(
                    Repost.repost_item_id == repost_digital_content_id,
                    Repost.repost_type == RepostType.digital_content,
                    Repost.is_current == True,
                    Repost.is_delete == False,
                )
                .intersect(
                    session.query(Follow.followee_user_id).filter(
                        Follow.follower_user_id == follower_user_id,
                        Follow.is_current == True,
                        Follow.is_delete == False,
                    )
                )
            ),
        )
        users = paginate_query(query).all()
        users = helpers.query_result_to_list(users)

    return users
