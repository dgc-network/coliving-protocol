from sqlalchemy import func
from src import exceptions
from src.models.playlists.playlist import Playlist
from src.models.tracks.track import Track
from src.models.users.user import User
from src.utils.db_session import get_db_read_replica


def get_max_id(type):
    if type not in ["track", "playlist", "user"]:
        raise exceptions.ArgumentError(
            "Invalid type provided, must be one of 'track', 'playlist', 'user'"
        )

    db = get_db_read_replica()
    with db.scoped_session() as session:
        if type == "track":
            latest = (
                session.query(func.max(Track.track_id))
                .filter(Track.is_unlisted == False)
                .filter(Track.is_current == True)
                .scalar()
            )
            return latest

        if type == "playlist":
            latest = (
                session.query(func.max(Playlist.playlist_id))
                .filter(Playlist.is_private == False)
                .filter(Playlist.is_current == True)
                .scalar()
            )
            return latest

        # user
        latest = (
            session.query(func.max(User.user_id))
            .filter(User.is_current == True)
            .scalar()
        )
        return latest
