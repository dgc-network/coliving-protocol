from flask_restx import fields
from flask_restx.fields import MarshallingError
from flask_restx.marshalling import marshal

from .common import ns

contentList_identifier = ns.model(
    "contentList_identifier",
    {
        # Use `FormattedString`s in these models to act as a constant via the source string arg ("contentList" here)
        "type": fields.FormattedString("contentList"),
        "contentList_id": fields.Integer(required=True),
    },
)

explore_contentList_identifier = ns.model(
    "explore_contentList_identifier",
    {
        "type": fields.FormattedString("explore_contentList"),
        "contentList_id": fields.String(required=True),
    },
)


class ContentListLibraryIdentifier(fields.Raw):
    def format(self, value):
        try:
            if value.get("type") == "contentList":
                return marshal(value, contentList_identifier)
            if value.get("type") == "explore_contentList":
                return marshal(value, explore_contentList_identifier)
            if value.get("type") == "folder":
                return marshal(value, contentList_library_folder)
        except Exception as e:
            raise MarshallingError(
                f"Unable to marshal as contentList library identifier: {str(value)}"
            ) from e

    def output(self, key, obj, **kwargs):
        return self.format(obj)


contentList_library_folder = ns.model(
    "contentList_library_folder",
    {
        "type": fields.FormattedString("folder"),
        "id": fields.String(required=True),
        "name": fields.String(required=True),
        "contents": fields.List(ContentListLibraryIdentifier),
    },
)

contentList_library = ns.model(
    "contentList_library", {"contents": fields.List(ContentListLibraryIdentifier)}
)
