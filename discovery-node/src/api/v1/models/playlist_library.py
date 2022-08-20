from flask_restx import fields
from flask_restx.fields import MarshallingError
from flask_restx.marshalling import marshal

from .common import ns

content list_identifier = ns.model(
    "content list_identifier",
    {
        # Use `FormattedString`s in these models to act as a constant via the source string arg ("content list" here)
        "type": fields.FormattedString("content list"),
        "content list_id": fields.Integer(required=True),
    },
)

explore_content list_identifier = ns.model(
    "explore_content list_identifier",
    {
        "type": fields.FormattedString("explore_content list"),
        "content list_id": fields.String(required=True),
    },
)


class ContentListLibraryIdentifier(fields.Raw):
    def format(self, value):
        try:
            if value.get("type") == "content list":
                return marshal(value, content list_identifier)
            if value.get("type") == "explore_content list":
                return marshal(value, explore_content list_identifier)
            if value.get("type") == "folder":
                return marshal(value, content list_library_folder)
        except Exception as e:
            raise MarshallingError(
                f"Unable to marshal as content list library identifier: {str(value)}"
            ) from e

    def output(self, key, obj, **kwargs):
        return self.format(obj)


content list_library_folder = ns.model(
    "content list_library_folder",
    {
        "type": fields.FormattedString("folder"),
        "id": fields.String(required=True),
        "name": fields.String(required=True),
        "contents": fields.List(ContentListLibraryIdentifier),
    },
)

content list_library = ns.model(
    "content list_library", {"contents": fields.List(ContentListLibraryIdentifier)}
)
