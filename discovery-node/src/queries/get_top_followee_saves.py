from sqlalchemy import desc, func
from src import exceptions
from src.models.social.follow import Follow
from src.models.social.save import Save
from src.models.agreements.agreement import Agreement
from src.queries import response_name_constants
from src.queries.query_helpers import (
    get_users_by_id,
    get_users_ids,
    populate_agreement_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_top_followee_saves(saveType, args):
    if saveType != "agreement":
        raise exceptions.ArgumentError("Invalid type provided, must be one of 'agreement'")

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
                Agreement,
            )
            .join(
                save_count_subquery,
                Agreement.agreement_id == save_count_subquery.c.save_item_id,
            )
            .filter(
                Agreement.is_current == True,
                Agreement.is_delete == False,
                Agreement.is_unlisted == False,
                Agreement.stem_of == None,
            )
        )

        agreements_query_results = agreements_query.all()
        agreements = helpers.query_result_to_list(agreements_query_results)
        agreement_ids = list(map(lambda agreement: agreement["agreement_id"], agreements))

        # bundle peripheral info into agreement results
        agreements = populate_agreement_metadata(session, agreement_ids, agreements, current_user_id)

        if args.get("with_users", False):
            user_id_list = get_users_ids(agreements)
            users = get_users_by_id(session, user_id_list)
            for agreement in agreements:
                user = users[agreement["owner_id"]]
                if user:
                    agreement["user"] = user

    return agreements
