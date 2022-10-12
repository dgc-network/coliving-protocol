from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import desc
from src.models.users.aggregate_user import AggregateUser
from src.models.users.related_landlord import RelatedLandlord
from src.models.users.user import User
from src.queries.query_helpers import helpers, populate_user_metadata
from src.utils.db_session import get_db_read_replica
from src.utils.helpers import time_method

# Only calculate for users with at least this many followers
MIN_FOLLOWER_REQUIREMENT = 200


def _get_related_landlords(session: Session, user_id: int, limit=100):
    related_landlords = (
        session.query(User)
        .select_from(RelatedLandlord)
        .join(User, User.user_id == RelatedLandlord.related_landlord_user_id)
        .filter(RelatedLandlord.user_id == user_id, User.is_current)
        .order_by(desc(RelatedLandlord.score))
        .limit(limit)
        .all()
    )
    return helpers.query_result_to_list(related_landlords)


@time_method
def get_related_landlords(user_id: int, current_user_id: int, limit: int = 100):
    db = get_db_read_replica()
    users = []
    with db.scoped_session() as session:
        aggregate_user = (
            session.query(AggregateUser)
            .filter(AggregateUser.user_id == user_id)
            .one_or_none()
        )
        if (
            aggregate_user
            and aggregate_user.digital_content_count > 0
            and aggregate_user.follower_count >= MIN_FOLLOWER_REQUIREMENT
        ):
            users = _get_related_landlords(session, user_id, limit)

        user_ids = list(map(lambda user: user["user_id"], users))
        users = populate_user_metadata(session, user_ids, users, current_user_id)
    return users
