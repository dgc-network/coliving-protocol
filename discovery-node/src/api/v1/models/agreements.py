from flask_restx import fields

from .common import favorite, ns, repost
from .users import user_model, user_model_full

agreement_artwork = ns.model(
    "agreement_artwork",
    {
        "150x150": fields.String,
        "480x480": fields.String,
        "1000x1000": fields.String,
    },
)

agreement_segment = ns.model(
    "agreement_segment",
    {
        "duration": fields.Float(required=True),
        "multihash": fields.String(required=True),
    },
)

agreement_element = ns.model(
    "agreement_element", {"parent_agreement_id": fields.String(required=True)}
)

remix_parent = ns.model(
    "remix_parent", {"agreements": fields.List(fields.Nested(agreement_element))}
)

full_remix = ns.model(
    "full_remix",
    {
        "parent_agreement_id": fields.String(required=True),
        "user": fields.Nested(user_model_full, required=True),
        "has_remix_author_reposted": fields.Boolean(required=True),
        "has_remix_author_saved": fields.Boolean(required=True),
    },
)

full_remix_parent = ns.model(
    "full_remix_parent", {"agreements": fields.List(fields.Nested(full_remix))}
)

stem_parent = ns.model(
    "stem_parent",
    {
        "category": fields.String(required=True),
        "parent_agreement_id": fields.Integer(required=True),
    },
)

download = ns.model(
    "download_metadata",
    {
        "cid": fields.String,
        "is_downloadable": fields.Boolean(required=True),
        "requires_follow": fields.Boolean(required=True),
    },
)

field_visibility = ns.model(
    "field_visibility",
    {
        "mood": fields.Boolean,
        "tags": fields.Boolean,
        "genre": fields.Boolean,
        "share": fields.Boolean,
        "play_count": fields.Boolean,
        "remixes": fields.Boolean,
    },
)
agreement = ns.model(
    "Agreement",
    {
        "artwork": fields.Nested(agreement_artwork, allow_null=True),
        "description": fields.String,
        "genre": fields.String,
        "id": fields.String(required=True),
        "mood": fields.String,
        "release_date": fields.String,
        "remix_of": fields.Nested(remix_parent),
        "repost_count": fields.Integer(required=True),
        "favorite_count": fields.Integer(required=True),
        "tags": fields.String,
        "title": fields.String(required=True),
        "user": fields.Nested(user_model, required=True),
        # Total agreement duration, rounded to the nearest second
        "duration": fields.Integer(required=True),
        # Whether or not the agreement is downloadable, see `download`
        # on `agreement_full` for more details
        "downloadable": fields.Boolean,
        "play_count": fields.Integer(required=True),
        "permalink": fields.String,
    },
)

agreement_full = ns.clone(
    "agreement_full",
    agreement,
    {
        "blocknumber": fields.Integer(required=True),
        "create_date": fields.String,
        "cover_art_sizes": fields.String,
        "created_at": fields.String,
        "credits_splits": fields.String,
        "download": fields.Nested(download),
        "isrc": fields.String,
        "license": fields.String,
        "iswc": fields.String,
        "field_visibility": fields.Nested(field_visibility),
        "followee_reposts": fields.List(fields.Nested(repost), required=True),
        "has_current_user_reposted": fields.Boolean(required=True),
        "is_unlisted": fields.Boolean(required=True),
        "has_current_user_saved": fields.Boolean(required=True),
        "followee_favorites": fields.List(fields.Nested(favorite), required=True),
        "route_id": fields.String(required=True),
        "stem_of": fields.Nested(stem_parent),
        "agreement_segments": fields.List(fields.Nested(agreement_segment)),
        "updated_at": fields.String,
        "user_id": fields.String(required=True),
        "user": fields.Nested(user_model_full, required=True),
        "is_delete": fields.Boolean,
        "cover_art": fields.String,
        "remix_of": fields.Nested(full_remix_parent),
        "is_available": fields.Boolean,
    },
)

stem_full = ns.model(
    "stem_full",
    {
        "id": fields.String(required=True),
        "parent_id": fields.String(required=True),
        "category": fields.String(required=True),
        "cid": fields.String(required=True),
        "user_id": fields.String(required=True),
        "blocknumber": fields.Integer(required=True),
    },
)

remixes_response = ns.model(
    "remixes_response",
    {
        "count": fields.Integer(required=True),
        "agreements": fields.List(fields.Nested(agreement_full)),
    },
)
