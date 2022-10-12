from sqlalchemy import desc, func
from src import exceptions
from src.models.social.follow import Follow
from src.models.social.save import Save
from src.models.agreements.digital_content import DigitalContent
from src.queries import response_name_constants
from src.queries.query_helpers import (
    get_users_by_id,
    get_users_ids,
    populate_digital_content_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_top_followee_saves(saveType, args):
    if saveType != "digital_content":
        raise exceptions.ArgumentError("Invalid type provided, must be one of 'digital_content'")

    limit = args.get("limit", 25)

    current_user_id = args.get("user_id")
    db = get_db_read_replica()
    with db.scoped_session() as session:
        # Construct a subquery of all followees
        followee_user_ids = session.query(Follow.followee_user_id).filter(
            Follow.follower_user_id == current_user_id,
            Follow.is_current == True,
            Follow.is_delete == False,
        )
        followee_user_ids_subquery = followee_user_ids.subquery()

        # Construct a subquery of all saves from followees aggregated by id
        save_count = (
            session.query(
                Save.save_item_id,
                func.count(Save.save_item_id).label(response_name_constants.save_count),
            )
            .join(
                followee_user_ids_subquery,
                Save.user_id == followee_user_ids_subquery.c.followee_user_id,
            )
            .filter(
                Save.is_current == True,
                Save.is_delete == False,
                Save.save_type == saveType,
            )
            .group_by(Save.save_item_id)
            .order_by(desc(response_name_constants.save_count))
            .limit(limit)
        )
        save_count_subquery = save_count.subquery()

        # Query for agreements joined against followee save counts
        agreements_query = (
            session.query(
                DigitalContent,
            )
            .join(
                save_count_subquery,
                DigitalContent.digital_content_id == save_count_subquery.c.save_item_id,
            )
            .filter(
                DigitalContent.is_current == True,
                DigitalContent.is_delete == False,
                DigitalContent.is_unlisted == False,
                DigitalContent.stem_of == None,
            )
        )

        agreements_query_results = agreements_query.all()
        agreements = helpers.query_result_to_list(agreements_query_results)
        digital_content_ids = list(map(lambda digital_content: digital_content["digital_content_id"], agreements))

        # bundle peripheral info into digital_content results
        agreements = populate_digital_content_metadata(session, digital_content_ids, agreements, current_user_id)

        if args.get("with_users", False):
            user_id_list = get_users_ids(agreements)
            users = get_users_by_id(session, user_id_list)
            for digital_content in agreements:
                user = users[digital_content["owner_id"]]
                if user:
                    digital_content["user"] = user

    return agreements
