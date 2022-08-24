from src.models.social.save import Save, SaveType
from src.models.agreements.agreement import Agreement
from src.queries import response_name_constants
from src.queries.query_helpers import (
    add_query_pagination,
    get_users_by_id,
    get_users_ids,
    populate_agreement_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_save_agreements(args):
    user_id = args.get("user_id")
    current_user_id = args.get("current_user_id")
    limit = args.get("limit")
    offset = args.get("offset")
    filter_deleted = args.get("filter_deleted")

    db = get_db_read_replica()
    with db.scoped_session() as session:
        base_query = (
            session.query(Agreement, Save.created_at)
            .join(Save, Save.save_item_id == Agreement.agreement_id)
            .filter(
                Agreement.is_current == True,
                Save.user_id == user_id,
                Save.is_current == True,
                Save.is_delete == False,
                Save.save_type == SaveType.agreement,
            )
        )

        # Allow filtering of deletes
        if filter_deleted:
            base_query = base_query.filter(Agreement.is_delete == False)

        base_query = base_query.order_by(Save.created_at.desc(), Agreement.agreement_id.desc())

        query_results = add_query_pagination(base_query, limit, offset).all()

        if not query_results:
            return []

        agreements, save_dates = zip(*query_results)
        agreements = helpers.query_result_to_list(agreements)
        agreement_ids = list(map(lambda agreement: agreement["agreement_id"], agreements))

        # bundle peripheral info into agreement results
        agreements = populate_agreement_metadata(session, agreement_ids, agreements, current_user_id)

        if args.get("with_users", False):
            user_id_list = get_users_ids(agreements)
            users = get_users_by_id(session, user_id_list, current_user_id)
            for agreement in agreements:
                user = users[agreement["owner_id"]]
                if user:
                    agreement["user"] = user

        for idx, agreement in enumerate(agreements):
            agreement[response_name_constants.activity_timestamp] = save_dates[idx]

        return agreements
