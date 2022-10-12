from src.models.social.save import Save, SaveType
from src.models.digitalContents.digital_content import DigitalContent
from src.queries import response_name_constants
from src.queries.query_helpers import (
    add_query_pagination,
    get_users_by_id,
    get_users_ids,
    populate_digital_content_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_save_digital_contents(args):
    user_id = args.get("user_id")
    current_user_id = args.get("current_user_id")
    limit = args.get("limit")
    offset = args.get("offset")
    filter_deleted = args.get("filter_deleted")

    db = get_db_read_replica()
    with db.scoped_session() as session:
        base_query = (
            session.query(DigitalContent, Save.created_at)
            .join(Save, Save.save_item_id == DigitalContent.digital_content_id)
            .filter(
                DigitalContent.is_current == True,
                Save.user_id == user_id,
                Save.is_current == True,
                Save.is_delete == False,
                Save.save_type == SaveType.digital_content,
            )
        )

        # Allow filtering of deletes
        if filter_deleted:
            base_query = base_query.filter(DigitalContent.is_delete == False)

        base_query = base_query.order_by(Save.created_at.desc(), DigitalContent.digital_content_id.desc())

        query_results = add_query_pagination(base_query, limit, offset).all()

        if not query_results:
            return []

        digitalContents, save_dates = zip(*query_results)
        digitalContents = helpers.query_result_to_list(digitalContents)
        digital_content_ids = list(map(lambda digital_content: digital_content["digital_content_id"], digitalContents))

        # bundle peripheral info into digital_content results
        digitalContents = populate_digital_content_metadata(session, digital_content_ids, digitalContents, current_user_id)

        if args.get("with_users", False):
            user_id_list = get_users_ids(digitalContents)
            users = get_users_by_id(session, user_id_list, current_user_id)
            for digital_content in digitalContents:
                user = users[digital_content["owner_id"]]
                if user:
                    digital_content["user"] = user

        for idx, digital_content in enumerate(digitalContents):
            digital_content[response_name_constants.activity_timestamp] = save_dates[idx]

        return digitalContents
