import logging  # pylint: disable=C0302
from typing import List, Optional, TypedDict

from sqlalchemy import and_, func, or_
from sqlalchemy.sql.functions import coalesce
from src.models.social.aggregate_plays import AggregatePlay
from src.models.digitalContents.digital_content import DigitalContent
from src.models.digitalContents.digital_content_route import DigitalContentRoute
from src.models.users.user import User
from src.queries.get_unpopulated_digital_contents import get_unpopulated_digital_contents
from src.queries.query_helpers import (
    add_query_pagination,
    add_users_to_digital_contents,
    get_pagination_vars,
    parse_sort_param,
    populate_digital_content_metadata,
)
from src.utils import helpers, redis_connection
from src.utils.db_session import get_db_read_replica

logger = logging.getLogger(__name__)

redis = redis_connection.get_redis()


class RouteArgs(TypedDict):
    handle: str
    slug: str


class GetDigitalContentArgs(TypedDict):
    limit: int
    offset: int
    handle: str
    id: int
    current_user_id: int
    authed_user_id: Optional[int]
    min_block_number: int
    sort: str
    filter_deleted: bool
    routes: List[RouteArgs]
    with_users: bool


def _get_digital_contents(session, args):
    # Create initial query
    base_query = session.query(DigitalContent)
    base_query = base_query.filter(DigitalContent.is_current == True, DigitalContent.stem_of == None)

    if "routes" in args:
        routes = args.get("routes")
        # Join the routes table
        base_query = base_query.join(DigitalContentRoute, DigitalContentRoute.digital_content_id == DigitalContent.digital_content_id)

        # Add the query conditions for each route
        filter_cond = []
        for route in routes:
            filter_cond.append(
                and_(
                    DigitalContentRoute.slug == route["slug"],
                    DigitalContentRoute.owner_id == route["owner_id"],
                )
            )
        base_query = base_query.filter(or_(*filter_cond))
    else:
        # Only return unlisted digitalContents if either
        # - above case, routes are present (direct links to hidden digitalContents)
        # - the user is authenticated as the owner
        is_authed_user = (
            "user_id" in args
            and "authed_user_id" in args
            and args.get("user_id") == args.get("authed_user_id")
        )
        if not is_authed_user:
            base_query = base_query.filter(DigitalContent.is_unlisted == False)

    # Conditionally process an array of digitalContents
    if "id" in args:
        digital_content_id_list = args.get("id")
        try:
            # Update query with digital_content_id list
            base_query = base_query.filter(DigitalContent.digital_content_id.in_(digital_content_id_list))
        except ValueError as e:
            logger.error("Invalid value found in digital_content id list", exc_info=True)
            raise e

    # Allow filtering of digitalContents by a certain creator
    if "user_id" in args:
        user_id = args.get("user_id")
        base_query = base_query.filter(DigitalContent.owner_id == user_id)

    # Allow filtering of deletes
    if "filter_deleted" in args:
        filter_deleted = args.get("filter_deleted")
        if filter_deleted:
            base_query = base_query.filter(DigitalContent.is_delete == False)

    if "min_block_number" in args:
        min_block_number = args.get("min_block_number")
        base_query = base_query.filter(DigitalContent.blocknumber >= min_block_number)

    if "sort" in args:
        if args["sort"] == "date":
            base_query = base_query.order_by(
                coalesce(
                    # This func is defined in alembic migrations
                    func.to_date_safe(DigitalContent.release_date, "Dy Mon DD YYYY HH24:MI:SS"),
                    DigitalContent.created_at,
                ).desc(),
                DigitalContent.digital_content_id.desc(),
            )
        elif args["sort"] == "plays":
            base_query = base_query.join(
                AggregatePlay, AggregatePlay.play_item_id == DigitalContent.digital_content_id
            ).order_by(AggregatePlay.count.desc())
        else:
            whitelist_params = [
                "created_at",
                "create_date",
                "release_date",
                "blocknumber",
                "digital_content_id",
            ]
            base_query = parse_sort_param(base_query, DigitalContent, whitelist_params)

    query_results = add_query_pagination(base_query, args["limit"], args["offset"])
    digitalContents = helpers.query_result_to_list(query_results.all())
    return digitalContents


def get_digital_contents(args: GetDigitalContentArgs):
    """
    Gets digitalContents.
    A note on caching strategy:
        - This method is cached at two layers: at the API via the @cache decorator,
        and within this method using the shared get_unpopulated_digital_contents cache.

        The shared cache only works when fetching via ID, so calls to fetch digitalContents
        via handle, asc/desc sort, or filtering by block_number won't hit the shared cache.
        These will hit the API cache unless they have a current_user_id included.

    """
    digitalContents = []

    db = get_db_read_replica()
    with db.scoped_session() as session:

        def get_digital_contents_and_ids():
            if "handle" in args:
                handle = args.get("handle")
                user = (
                    session.query(User.user_id)
                    .filter(User.handle_lc == handle.lower())
                    .first()
                )
                args["user_id"] = user.user_id

            if "routes" in args:
                # Convert the handles to user_ids
                routes = args.get("routes")
                handles = [route["handle"].lower() for route in routes]
                user_id_tuples = (
                    session.query(User.user_id, User.handle_lc)
                    .filter(User.handle_lc.in_(handles), User.is_current == True)
                    .all()
                )
                user_id_map = {handle: user_id for (user_id, handle) in user_id_tuples}
                args["routes"] = []
                for route in routes:
                    if route["handle"].lower() in user_id_map:
                        args["routes"].append(
                            {
                                "slug": route["slug"],
                                "owner_id": user_id_map[route["handle"].lower()],
                            }
                        )
                # If none of the handles were found, return empty lists
                if not args["routes"]:
                    return ([], [])

            can_use_shared_cache = (
                "id" in args
                and "min_block_number" not in args
                and "sort" not in args
                and "user_id" not in args
            )

            if can_use_shared_cache:
                should_filter_deleted = args.get("filter_deleted", False)
                digitalContents = get_unpopulated_digital_contents(
                    session, args["id"], should_filter_deleted
                )
                digital_content_ids = list(map(lambda digital_content: digital_content["digital_content_id"], digitalContents))
                return (digitalContents, digital_content_ids)

            (limit, offset) = get_pagination_vars()
            args["limit"] = limit
            args["offset"] = offset

            digitalContents = _get_digital_contents(session, args)

            digital_content_ids = list(map(lambda digital_content: digital_content["digital_content_id"], digitalContents))

            return (digitalContents, digital_content_ids)

        (digitalContents, digital_content_ids) = get_digital_contents_and_ids()

        # bundle peripheral info into digital_content results
        current_user_id = args.get("current_user_id")

        # remove digital_content segments and download cids from deactivated user digitalContents and deleted digitalContents
        for digital_content in digitalContents:
            if digital_content["user"][0]["is_deactivated"] or digital_content["is_delete"]:
                digital_content["digital_content_segments"] = []
                if digital_content["download"] is not None:
                    digital_content["download"]["cid"] = None

        digitalContents = populate_digital_content_metadata(session, digital_content_ids, digitalContents, current_user_id)

        if args.get("with_users", False):
            add_users_to_digital_contents(session, digitalContents, current_user_id)
        else:
            # Remove the user from the digitalContents
            digitalContents = [
                {key: val for key, val in dict.items() if key != "user"}
                for dict in digitalContents
            ]
    return digitalContents
