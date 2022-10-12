from flask_restx import fields

from .common import favorite, ns, repost
from .users import user_model, user_model_full

digital_content_artwork = ns.model(
    "digital_content_artwork",
    {
        "150x150": fields.String,
        "480x480": fields.String,
        "1000x1000": fields.String,
    },
)

digital_content_segment = ns.model(
    "digital_content_segment",
    {
        "duration": fields.Float(required=True),
        "multihash": fields.String(required=True),
    },
)

digital_content_element = ns.model(
    "digital_content_element", {"parent_digital_content_id": fields.String(required=True)}
)

remix_parent = ns.model(
    "remix_parent", {"digitalContents": fields.List(fields.Nested(digital_content_element))}
)

full_remix = ns.model(
    "full_remix",
    {
        "parent_digital_content_id": fields.String(required=True),
        "user": fields.Nested(user_model_full, required=True),
        "has_remix_author_reposted": fields.Boolean(required=True),
        "has_remix_author_saved": fields.Boolean(required=True),
    },
)

full_remix_parent = ns.model(
    "full_remix_parent", {"digitalContents": fields.List(fields.Nested(full_remix))}
)

stem_parent = ns.model(
    "stem_parent",
    {
        "category": fields.String(required=True),
        "parent_digital_content_id": fields.Integer(required=True),
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
digital_content = ns.model(
    "DigitalContent",
    {
        "artwork": fields.Nested(digital_content_artwork, allow_null=True),
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
        # Total digital_content duration, rounded to the nearest second
        "duration": fields.Integer(required=True),
        # Whether or not the digital_content is downloadable, see `download`
        # on `digital_content_full` for more details
        "downloadable": fields.Boolean,
        "play_count": fields.Integer(required=True),
        "permalink": fields.String,
    },
)

digital_content_full = ns.clone(
    "digital_content_full",
    digital_content,
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
        "digital_content_segments": fields.List(fields.Nested(digital_content_segment)),
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
        "digitalContents": fields.List(fields.Nested(digital_content_full)),
    },
)
