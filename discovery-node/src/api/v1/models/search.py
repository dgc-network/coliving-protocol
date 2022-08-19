from flask_restx import fields

from .common import ns
from .playlists import full_playlist_model
from .agreements import agreement_full
from .users import user_model_full

search_model = ns.model(
    "search_model",
    {
        "users": fields.List(fields.Nested(user_model_full), required=True),
        "followed_users": fields.List(fields.Nested(user_model_full), required=False),
        "agreements": fields.List(fields.Nested(agreement_full), required=True),
        "saved_agreements": fields.List(fields.Nested(agreement_full), required=False),
        "playlists": fields.List(fields.Nested(full_playlist_model), required=True),
        "saved_playlists": fields.List(
            fields.Nested(full_playlist_model), required=False
        ),
        "albums": fields.List(fields.Nested(full_playlist_model), required=True),
        "saved_albums": fields.List(fields.Nested(full_playlist_model), required=False),
    },
)
