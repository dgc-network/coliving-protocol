from src import exceptions
from src.models.content_lists.content_list import ContentList
from src.models.social.save import Save, SaveType
from src.models.digitalContents.digital_content import DigitalContent
from src.queries.query_helpers import paginate_query
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_saves(save_type, user_id):
    save_query_type = None
    if save_type == "albums":
        save_query_type = SaveType.album
    elif save_type == "content_lists":
        save_query_type = SaveType.contentList
    elif save_type == "digitalContents":
        save_query_type = SaveType.digital_content
    else:
        raise exceptions.ArgumentError("Invalid save type provided")

    save_results = []
    db = get_db_read_replica()
    with db.scoped_session() as session:
        query = session.query(Save).filter(
            Save.user_id == user_id,
            Save.is_current == True,
            Save.is_delete == False,
            Save.save_type == save_query_type,
        )
        # filter out saves for deleted entries
        if save_type == "albums":
            query = query.filter(
                Save.save_item_id.in_(
                    session.query(ContentList.content_list_id).filter(
                        ContentList.is_album == True, ContentList.is_current == True
                    )
                )
            )
        elif save_type == "content_lists":
            query = query.filter(
                Save.save_item_id.in_(
                    session.query(ContentList.content_list_id).filter(
                        ContentList.is_album == False, ContentList.is_current == True
                    )
                )
            )
        elif save_type == "digitalContents":
            query = query.filter(
                Save.save_item_id.in_(
                    session.query(DigitalContent.digital_content_id).filter(DigitalContent.is_current == True)
                )
            )

        query_results = paginate_query(query).all()
        save_results = helpers.query_result_to_list(query_results)

    return save_results
