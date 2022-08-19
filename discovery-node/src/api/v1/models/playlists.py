from flask_restx import fields
from src.api.v1.models.agreements import agreement_full
from src.api.v1.models.users import user_model, user_model_full

from .common import favorite, ns, repost

playlist_artwork = ns.model(
    "playlist_artwork",
    {
        "150x150": fields.String,
        "480x480": fields.String,
        "1000x1000": fields.String,
    },
)

playlist_added_timestamp = ns.model(
    "playlist_added_timestamp",
    {
        "timestamp": fields.Integer(required=True),
        "agreement_id": fields.String(required=True),
    },
)

playlist_model = ns.model(
    "playlist",
    {
        "artwork": fields.Nested(playlist_artwork, allow_null=True),
        "description": fields.String,
        "id": fields.String(required=True),
        "is_album": fields.Boolean(required=True),
        "playlist_name": fields.String(required=True),
        "repost_count": fields.Integer(required=True),
        "favorite_count": fields.Integer(required=True),
        "total_play_count": fields.Integer(required=True),
        "user": fields.Nested(user_model, required=True),
    },
)

full_playlist_model = ns.clone(
    "playlist_full",
    playlist_model,
    {
        "blocknumber": fields.Integer(required=True),
        "created_at": fields.String,
        "followee_reposts": fields.List(fields.Nested(repost), required=True),
        "followee_favorites": fields.List(fields.Nested(favorite), required=True),
        "has_current_user_reposted": fields.Boolean(required=True),
        "has_current_user_saved": fields.Boolean(required=True),
        "is_delete": fields.Boolean(required=True),
        "is_private": fields.Boolean(required=True),
        "updated_at": fields.String,
        "added_timestamps": fields.List(
            fields.Nested(playlist_added_timestamp), required=True
        ),
        "user_id": fields.String(required=True),
        "user": fields.Nested(user_model_full, required=True),
        "agreements": fields.List(fields.Nested(agreement_full), required=True),
        "cover_art": fields.String,
        "cover_art_sizes": fields.String,
        "agreement_count": fields.Integer(required=True),
    },
)
