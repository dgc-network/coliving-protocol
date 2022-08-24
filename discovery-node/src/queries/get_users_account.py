from sqlalchemy import and_, asc, desc, or_
from src import exceptions
from src.models.content_lists.content_list import ContentList
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

        # Get saved contentLists / albums ids
        saved_query = session.query(Save.save_item_id).filter(
            Save.user_id == user_id,
            Save.is_current == True,
            Save.is_delete == False,
            or_(Save.save_type == SaveType.contentList, Save.save_type == SaveType.album),
        )

        saved_query_results = saved_query.all()
        save_collection_ids = [item[0] for item in saved_query_results]

        # Get ContentList/Albums saved or owned by the user
        content_list_query = (
            session.query(ContentList)
            .filter(
                or_(
                    and_(
                        ContentList.is_current == True,
                        ContentList.is_delete == False,
                        ContentList.content_list_owner_id == user_id,
                    ),
                    and_(
                        ContentList.is_current == True,
                        ContentList.is_delete == False,
                        ContentList.content_list_id.in_(save_collection_ids),
                    ),
                )
            )
            .order_by(desc(ContentList.created_at))
        )
        contentLists = content_list_query.all()
        contentLists = helpers.query_result_to_list(contentLists)

        content_list_owner_ids = list(
            {contentList["content_list_owner_id"] for contentList in contentLists}
        )

        # Get Users for the ContentList/Albums
        users = get_unpopulated_users(session, content_list_owner_ids)

        user_map = {}

        stripped_content_lists = []
        # Map the users to the contentLists/albums
        for content_list_owner in users:
            user_map[content_list_owner["user_id"]] = content_list_owner
        for contentList in contentLists:
            content_list_owner = user_map[contentList["content_list_owner_id"]]
            stripped_content_list = {
                "id": contentList["content_list_id"],
                "name": contentList["content_list_name"],
                "is_album": contentList["is_album"],
                "user": {
                    "id": content_list_owner["user_id"],
                    "handle": content_list_owner["handle"],
                },
            }
            if content_list_owner["is_deactivated"]:
                stripped_content_list["user"]["is_deactivated"] = True
            stripped_content_lists.append(stripped_content_list)
        user["content_lists"] = stripped_content_lists

    return user
