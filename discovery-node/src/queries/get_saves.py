from src import exceptions
from src.models.playlists.playlist import Playlist
from src.models.social.save import Save, SaveType
from src.models.agreements.agreement import Agreement
from src.queries.query_helpers import paginate_query
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_saves(save_type, user_id):
    save_query_type = None
    if save_type == "albums":
        save_query_type = SaveType.album
    elif save_type == "playlists":
        save_query_type = SaveType.playlist
    elif save_type == "agreements":
        save_query_type = SaveType.agreement
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
                    session.query(Playlist.playlist_id).filter(
                        Playlist.is_album == True, Playlist.is_current == True
                    )
                )
            )
        elif save_type == "playlists":
            query = query.filter(
                Save.save_item_id.in_(
                    session.query(Playlist.playlist_id).filter(
                        Playlist.is_album == False, Playlist.is_current == True
                    )
                )
            )
        elif save_type == "agreements":
            query = query.filter(
                Save.save_item_id.in_(
                    session.query(Agreement.agreement_id).filter(Agreement.is_current == True)
                )
            )

        query_results = paginate_query(query).all()
        save_results = helpers.query_result_to_list(query_results)

    return save_results
