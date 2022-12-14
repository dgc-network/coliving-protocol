import re
from urllib.parse import urlparse

from flask.helpers import url_for
from src.api.v1 import api as api_v1
from src.api.v1.content_lists import ns as content_lists_ns
from src.api.v1.digitalContents import ns as digitalContents_ns
from src.api.v1.users import ns as users_ns
from src.models.users.user import User
from src.utils.helpers import encode_int_id

digital_content_url_regex = re.compile(r"^/(?P<handle>[^/]*)/(?P<slug>[^/]*)$")
content_list_url_regex = re.compile(
    r"/(?P<handle>[^/]*)/(contentList|album)/(?P<digital_content>[^/]*)(?=-)-(?P<id>[0-9]*)$"
)
user_url_regex = re.compile(r"^/(?P<handle>[^/]*)$")


def ns_url_for(ns, route, **kwargs):
    return url_for(f"{api_v1.bp.name}.{ns.name}_{route}", **kwargs)


def resolve_url(session, url):
    """
    Resolves an Coliving URL into the cannonical API route.
    Accepts fully formed urls as well as just url paths.
    """
    parsed = urlparse(url)
    # Will strip out any preceding protocol & domain (e.g. https://coliving.lol)
    path = parsed.path

    match = digital_content_url_regex.match(path)
    if match:
        slug = match.group("slug")
        handle = match.group("handle")
        return ns_url_for(digitalContents_ns, "bulk_digital_contents", slug=slug, handle=handle)

    match = content_list_url_regex.match(path)
    if match:
        content_list_id = match.group("id")
        hashed_id = encode_int_id(int(content_list_id))
        return ns_url_for(content_lists_ns, "content_list", content_list_id=hashed_id)

    match = user_url_regex.match(path)
    if match:
        handle = match.group("handle")
        user = (
            session.query(User)
            .filter(User.handle_lc == handle.lower(), User.is_current == True)
            .one()
        )
        hashed_id = encode_int_id(user.user_id)
        return ns_url_for(users_ns, "user", id=hashed_id)

    return None
