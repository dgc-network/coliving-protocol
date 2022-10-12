import logging  # pylint: disable=C0302

from flask.globals import request
from sqlalchemy import and_, or_
from src.models.digitalContents.digital_content import DigitalContent
from src.queries.query_helpers import (
    get_users_by_id,
    get_users_ids,
    paginate_query,
    populate_digital_content_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica
from src.utils.redis_cache import extract_key, use_redis_cache

logger = logging.getLogger(__name__)

UNPOPULATED_AGREEMENT_CACHE_DURATION_SEC = 10


def make_cache_key(args):
    ids = map(lambda x: str(x["id"]), args.get("identifiers"))
    ids = ",".join(ids)
    cache_keys = {
        "ids": ids,
        "filter_deleted": args.get("filter_deleted"),
        "with_users": args.get("with_user"),
    }
    key = extract_key(f"unpopulated-digital-contents:{request.path}", cache_keys.items())
    return key


def get_digital_contents_including_unlisted(args):
    """Fetch a digital_content, allowing unlisted.

    Args:
        args: dict
        args.identifiers: array of { handle, id, url_title} dicts
        args.current_user_id: optional current user ID
        args.filter_deleted: filter deleted digitalContents
        args.with_users: include users in unlisted digitalContents
    """
    digitalContents = []
    identifiers = args["identifiers"]
    for i in identifiers:
        helpers.validate_arguments(i, ["handle", "id", "url_title"])

    current_user_id = args.get("current_user_id")
    db = get_db_read_replica()
    with db.scoped_session() as session:

        def get_unpopulated_digital_content():
            base_query = session.query(DigitalContent)
            filter_cond = []

            # Create filter conditions as a list of `and` clauses
            for i in identifiers:
                filter_cond.append(
                    and_(DigitalContent.is_current == True, DigitalContent.digital_content_id == i["id"])
                )

            # Pass array of `and` clauses into an `or` clause as destructured *args
            base_query = base_query.filter(or_(*filter_cond))

            # Allow filtering of deletes
            # Note: There is no standard for boolean url parameters, and any value (including 'false')
            # will be evaluated as true, so an explicit check is made for true
            if "filter_deleted" in args:
                filter_deleted = args.get("filter_deleted")
                if filter_deleted:
                    base_query = base_query.filter(DigitalContent.is_delete == False)

            # Perform the query
            # TODO: pagination is broken with unlisted digitalContents
            query_results = paginate_query(base_query).all()
            digitalContents = helpers.query_result_to_list(query_results)

            # Mapping of digital_content_id -> digital_content object from request;
            # used to check route_id when iterating through identifiers
            identifiers_map = {digital_content["id"]: digital_content for digital_content in identifiers}

            # If the digital_content is unlisted and the generated route_id does not match the route_id in db,
            # filter digital_content out from response
            def filter_fn(digital_content):
                input_digital_content = identifiers_map[digital_content["digital_content_id"]]
                route_id = helpers.create_digital_content_route_id(
                    input_digital_content["url_title"], input_digital_content["handle"]
                )

                return not digital_content["is_unlisted"] or digital_content["route_id"] == route_id

            digitalContents = list(filter(filter_fn, digitalContents))

            digital_content_ids = list(map(lambda digital_content: digital_content["digital_content_id"], digitalContents))
            return (digitalContents, digital_content_ids)

        key = make_cache_key(args)
        (digitalContents, digital_content_ids) = use_redis_cache(
            key, UNPOPULATED_AGREEMENT_CACHE_DURATION_SEC, get_unpopulated_digital_content
        )

        # Add users
        if args.get("with_users", False):
            user_id_list = get_users_ids(digitalContents)
            users = get_users_by_id(session, user_id_list, current_user_id)
            for digital_content in digitalContents:
                user = users[digital_content["owner_id"]]
                if user:
                    digital_content["user"] = user
        # Populate metadata
        digitalContents = populate_digital_content_metadata(session, digital_content_ids, digitalContents, current_user_id)

    return digitalContents
