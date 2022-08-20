from sqlalchemy import and_, asc, desc, or_
from src import exceptions
from src.models.contentLists.contentList import ContentList
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
        contentList_query = (
            session.query(ContentList)
            .filter(
                or_(
                    and_(
                        ContentList.is_current == True,
                        ContentList.is_delete == False,
                        ContentList.contentList_owner_id == user_id,
                    ),
                    and_(
                        ContentList.is_current == True,
                        ContentList.is_delete == False,
                        ContentList.contentList_id.in_(save_collection_ids),
                    ),
                )
            )
            .order_by(desc(ContentList.created_at))
        )
        contentLists = contentList_query.all()
        contentLists = helpers.query_result_to_list(contentLists)

        contentList_owner_ids = list(
            {contentList["contentList_owner_id"] for contentList in contentLists}
        )

        # Get Users for the ContentList/Albums
        users = get_unpopulated_users(session, contentList_owner_ids)

        user_map = {}

        stripped_contentLists = []
        # Map the users to the contentLists/albums
        for contentList_owner in users:
            user_map[contentList_owner["user_id"]] = contentList_owner
        for contentList in contentLists:
            contentList_owner = user_map[contentList["contentList_owner_id"]]
            stripped_contentList = {
                "id": contentList["contentList_id"],
                "name": contentList["contentList_name"],
                "is_album": contentList["is_album"],
                "user": {
                    "id": contentList_owner["user_id"],
                    "handle": contentList_owner["handle"],
                },
            }
            if contentList_owner["is_deactivated"]:
                stripped_contentList["user"]["is_deactivated"] = True
            stripped_contentLists.append(stripped_contentList)
        user["contentLists"] = stripped_contentLists

    return user
