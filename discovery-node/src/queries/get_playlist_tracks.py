import logging  # pylint: disable=C0302

import sqlalchemy
from src.models.playlists.playlist import Playlist
from src.models.agreements.agreement import Agreement
from src.queries.query_helpers import add_users_to_agreements, populate_agreement_metadata
from src.utils import helpers

logger = logging.getLogger(__name__)


def get_playlist_agreements(session, args):
    """Accepts args:
    {
        # optionally pass in full playlists to avoid having to fetch
        "playlists": Playlist[]

        # not needed if playlists are passed
        "playlist_ids": string[]
        "current_user_id": int
        "populate_agreements": boolean # whether to add users & metadata to agreements
    }

    Returns: {
        playlist_id: Playlist
    }
    """

    try:
        playlists = args.get("playlists")
        if not playlists:
            playlist_ids = args.get("playlist_ids", [])
            playlists = session.query(Playlist).filter(
                Playlist.is_current == True, Playlist.playlist_id.in_(playlist_ids)
            )
            playlists = list(map(helpers.model_to_dictionary, playlists))

        if not playlists:
            return {}

        # agreement_id -> [playlist_id]
        agreement_ids_set = set()
        for playlist in playlists:
            playlist_id = playlist["playlist_id"]
            for agreement_id_dict in playlist["playlist_contents"]["agreement_ids"]:
                agreement_id = agreement_id_dict["agreement"]
                agreement_ids_set.add(agreement_id)

        playlist_agreements = (
            session.query(Agreement)
            .filter(Agreement.is_current == True, Agreement.agreement_id.in_(list(agreement_ids_set)))
            .all()
        )

        agreements = helpers.query_result_to_list(playlist_agreements)

        if args.get("populate_agreements"):
            current_user_id = args.get("current_user_id")
            agreements = populate_agreement_metadata(
                session, list(agreement_ids_set), agreements, current_user_id
            )

            add_users_to_agreements(session, agreements, current_user_id)

        # { agreement_id => agreement }
        agreement_ids_map = {agreement["agreement_id"]: agreement for agreement in agreements}

        # { playlist_id => [agreement]}
        playlists_map = {}
        for playlist in playlists:
            playlist_id = playlist["playlist_id"]
            playlists_map[playlist_id] = []
            for agreement_id_dict in playlist["playlist_contents"]["agreement_ids"]:
                agreement_id = agreement_id_dict["agreement"]
                agreement = agreement_ids_map[agreement_id]
                playlists_map[playlist_id].append(agreement)

        return playlists_map

    except sqlalchemy.orm.exc.NoResultFound:
        return {}
