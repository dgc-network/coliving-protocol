import re
from urllib.parse import urlparse

from flask.helpers import url_for
from src.api.v1 import api as api_v1
from src.api.v1.contentLists import ns as contentLists_ns
from src.api.v1.agreements import ns as agreements_ns
from src.api.v1.users import ns as users_ns
from src.models.users.user import User
from src.utils.helpers import encode_int_id

agreement_url_regex = re.compile(r"^/(?P<handle>[^/]*)/(?P<slug>[^/]*)$")
contentList_url_regex = re.compile(
    r"/(?P<handle>[^/]*)/(contentList|album)/(?P<agreement>[^/]*)(?=-)-(?P<id>[0-9]*)$"
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

    match = agreement_url_regex.match(path)
    if match:
        slug = match.group("slug")
        handle = match.group("handle")
        return ns_url_for(agreements_ns, "bulk_agreements", slug=slug, handle=handle)

    match = contentList_url_regex.match(path)
    if match:
        contentList_id = match.group("id")
        hashed_id = encode_int_id(int(contentList_id))
        return ns_url_for(contentLists_ns, "contentList", contentList_id=hashed_id)

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
