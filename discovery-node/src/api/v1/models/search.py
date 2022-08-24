from flask_restx import fields

from .common import ns
from .contentLists import full_content_list_model
from .agreements import agreement_full
from .users import user_model_full

search_model = ns.model(
    "search_model",
    {
        "users": fields.List(fields.Nested(user_model_full), required=True),
        "followed_users": fields.List(fields.Nested(user_model_full), required=False),
        "agreements": fields.List(fields.Nested(agreement_full), required=True),
        "saved_agreements": fields.List(fields.Nested(agreement_full), required=False),
        "content_lists": fields.List(fields.Nested(full_content_list_model), required=True),
        "saved_content_lists": fields.List(
            fields.Nested(full_content_list_model), required=False
        ),
        "albums": fields.List(fields.Nested(full_content_list_model), required=True),
        "saved_albums": fields.List(fields.Nested(full_content_list_model), required=False),
    },
)
