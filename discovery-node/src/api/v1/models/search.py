from flask_restx import fields

from .common import ns
from .content_lists import full_content_list_model
from .digitalContents import digital_content_full
from .users import user_model_full

search_model = ns.model(
    "search_model",
    {
        "users": fields.List(fields.Nested(user_model_full), required=True),
        "followed_users": fields.List(fields.Nested(user_model_full), required=False),
        "digitalContents": fields.List(fields.Nested(digital_content_full), required=True),
        "saved_digital_contents": fields.List(fields.Nested(digital_content_full), required=False),
        "content_lists": fields.List(fields.Nested(full_content_list_model), required=True),
        "saved_content_lists": fields.List(
            fields.Nested(full_content_list_model), required=False
        ),
        "albums": fields.List(fields.Nested(full_content_list_model), required=True),
        "saved_albums": fields.List(fields.Nested(full_content_list_model), required=False),
    },
)
