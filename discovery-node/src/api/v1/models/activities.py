from flask_restx import fields
from flask_restx.fields import MarshallingError
from flask_restx.marshalling import marshal

from .common import ns
from .content lists import full_content list_model, content list_model
from .agreements import agreement, agreement_full


class ItemType(fields.Raw):
    def format(self, value):
        if value == "agreement":
            return "agreement"
        if value == "content list":
            return "content list"
        raise MarshallingError("Unable to marshal as activity type")


class ActivityItem(fields.Raw):
    def format(self, value):
        try:
            if value.get("agreement_id"):
                return marshal(value, agreement)
            if value.get("content list_id"):
                return marshal(value, content list_model)
        except Exception as e:
            raise MarshallingError("Unable to marshal as activity item") from e


class FullActivityItem(fields.Raw):
    def format(self, value):
        try:
            if value.get("agreement_id"):
                return marshal(value, agreement_full)
            if value.get("content list_id"):
                return marshal(value, full_content list_model)
        except Exception as e:
            raise MarshallingError("Unable to marshal as activity item") from e


activity_model = ns.model(
    "activity",
    {
        "timestamp": fields.String(allow_null=True),
        "item_type": ItemType,
        "item": ActivityItem,
    },
)

activity_model_full = ns.model(
    "activity_full",
    {
        "timestamp": fields.String(allow_null=True),
        "item_type": ItemType,
        "item": FullActivityItem,
    },
)
