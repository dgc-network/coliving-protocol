from sqlalchemy import and_, asc, desc, or_
from src import exceptions
from src.models.content lists.content list import ContentList
from src.models.social.save import Save, SaveType
from src.models.users.user import User
from src.queries.get_unpopulated_users import get_unpopulated_users
from src.queries.query_helpers import populate_user_metadata
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_users_account(args):
    db = get_db_read_replica()
    with db.scoped_session() as session:
        # Create initial query
        base_query = session.query(User)
        # Don't return the user if they have no wallet or handle (user creation did not finish properly on chain)
        base_query = base_query.filter(
            User.is_current == True, User.wallet != None, User.handle != None
        )

        if "wallet" not in args:
            raise exceptions.ArgumentError("Missing wallet param")

        wallet = args.get("wallet")
        wallet = wallet.lower()
        if len(wallet) == 42:
            base_query = base_query.filter_by(wallet=wallet)
            base_query = base_query.order_by(asc(User.created_at))
        else:
            raise exceptions.ArgumentError("Invalid wallet length")

        # If user cannot be found, exit early and return empty response
        user = base_query.first()
        if not user:
            return None

        user = helpers.model_to_dictionary(user)
        user_id = user["user_id"]

        # bundle peripheral info into user results
        users = populate_user_metadata(session, [user_id], [user], user_id, True)
        user = users[0]

        # Get saved content lists / albums ids
        saved_query = session.query(Save.save_item_id).filter(
            Save.user_id == user_id,
            Save.is_current == True,
            Save.is_delete == False,
            or_(Save.save_type == SaveType.content list, Save.save_type == SaveType.album),
        )

        saved_query_results = saved_query.all()
        save_collection_ids = [item[0] for item in saved_query_results]

        # Get ContentList/Albums saved or owned by the user
        content list_query = (
            session.query(ContentList)
            .filter(
                or_(
                    and_(
                        ContentList.is_current == True,
                        ContentList.is_delete == False,
                        ContentList.content list_owner_id == user_id,
                    ),
                    and_(
                        ContentList.is_current == True,
                        ContentList.is_delete == False,
                        ContentList.content list_id.in_(save_collection_ids),
                    ),
                )
            )
            .order_by(desc(ContentList.created_at))
        )
        content lists = content list_query.all()
        content lists = helpers.query_result_to_list(content lists)

        content list_owner_ids = list(
            {content list["content list_owner_id"] for content list in content lists}
        )

        # Get Users for the ContentList/Albums
        users = get_unpopulated_users(session, content list_owner_ids)

        user_map = {}

        stripped_content lists = []
        # Map the users to the content lists/albums
        for content list_owner in users:
            user_map[content list_owner["user_id"]] = content list_owner
        for content list in content lists:
            content list_owner = user_map[content list["content list_owner_id"]]
            stripped_content list = {
                "id": content list["content list_id"],
                "name": content list["content list_name"],
                "is_album": content list["is_album"],
                "user": {
                    "id": content list_owner["user_id"],
                    "handle": content list_owner["handle"],
                },
            }
            if content list_owner["is_deactivated"]:
                stripped_content list["user"]["is_deactivated"] = True
            stripped_content lists.append(stripped_content list)
        user["content lists"] = stripped_content lists

    return user
