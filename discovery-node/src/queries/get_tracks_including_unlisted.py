import logging  # pylint: disable=C0302

from flask.globals import request
from sqlalchemy import and_, or_
from src.models.agreements.agreement import Agreement
from src.queries.query_helpers import (
    get_users_by_id,
    get_users_ids,
    paginate_query,
    populate_agreement_metadata,
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
    key = extract_key(f"unpopulated-agreements:{request.path}", cache_keys.items())
    return key


def get_agreements_including_unlisted(args):
    """Fetch a agreement, allowing unlisted.

    Args:
        args: dict
        args.identifiers: array of { handle, id, url_title} dicts
        args.current_user_id: optional current user ID
        args.filter_deleted: filter deleted agreements
        args.with_users: include users in unlisted agreements
    """
    agreements = []
    identifiers = args["identifiers"]
    for i in identifiers:
        helpers.validate_arguments(i, ["handle", "id", "url_title"])

    current_user_id = args.get("current_user_id")
    db = get_db_read_replica()
    with db.scoped_session() as session:

        def get_unpopulated_agreement():
            base_query = session.query(Agreement)
            filter_cond = []

            # Create filter conditions as a list of `and` clauses
            for i in identifiers:
                filter_cond.append(
                    and_(Agreement.is_current == True, Agreement.agreement_id == i["id"])
                )

            # Pass array of `and` clauses into an `or` clause as destructured *args
            base_query = base_query.filter(or_(*filter_cond))

            # Allow filtering of deletes
            # Note: There is no standard for boolean url parameters, and any value (including 'false')
            # will be evaluated as true, so an explicit check is made for true
            if "filter_deleted" in args:
                filter_deleted = args.get("filter_deleted")
                if filter_deleted:
                    base_query = base_query.filter(Agreement.is_delete == False)

            # Perform the query
            # TODO: pagination is broken with unlisted agreements
            query_results = paginate_query(base_query).all()
            agreements = helpers.query_result_to_list(query_results)

            # Mapping of agreement_id -> agreement object from request;
            # used to check route_id when iterating through identifiers
            identifiers_map = {agreement["id"]: agreement for agreement in identifiers}

            # If the agreement is unlisted and the generated route_id does not match the route_id in db,
            # filter agreement out from response
            def filter_fn(agreement):
                input_agreement = identifiers_map[agreement["agreement_id"]]
                route_id = helpers.create_agreement_route_id(
                    input_agreement["url_title"], input_agreement["handle"]
                )

                return not agreement["is_unlisted"] or agreement["route_id"] == route_id

            agreements = list(filter(filter_fn, agreements))

            agreement_ids = list(map(lambda agreement: agreement["agreement_id"], agreements))
            return (agreements, agreement_ids)

        key = make_cache_key(args)
        (agreements, agreement_ids) = use_redis_cache(
            key, UNPOPULATED_AGREEMENT_CACHE_DURATION_SEC, get_unpopulated_agreement
        )

        # Add users
        if args.get("with_users", False):
            user_id_list = get_users_ids(agreements)
            users = get_users_by_id(session, user_id_list, current_user_id)
            for agreement in agreements:
                user = users[agreement["owner_id"]]
                if user:
                    agreement["user"] = user
        # Populate metadata
        agreements = populate_agreement_metadata(session, agreement_ids, agreements, current_user_id)

    return agreements
