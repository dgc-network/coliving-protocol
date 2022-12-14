from flask_restx import fields
from flask_restx.fields import MarshallingError
from flask_restx.marshalling import marshal

from .common import ns
from .content_lists import full_content_list_model, content_list_model
from .digitalContents import digital_content, digital_content_full


class ItemType(fields.Raw):
    def format(self, value):
        if value == "digital_content":
            return "digital_content"
        if value == "content_list":
            return "content_list"
        raise MarshallingError("Unable to marshal as activity type")


class ActivityItem(fields.Raw):
    def format(self, value):
        try:
            if value.get("digital_content_id"):
                return marshal(value, digital_content)
            if value.get("content_list_id"):
                return marshal(value, content_list_model)
        except Exception as e:
            raise MarshallingError("Unable to marshal as activity item") from e


class FullActivityItem(fields.Raw):
    def format(self, value):
        try:
            if value.get("digital_content_id"):
                return marshal(value, digital_content_full)
            if value.get("content_list_id"):
                return marshal(value, full_content_list_model)
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
