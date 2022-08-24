import logging  # pylint: disable=C0302
from typing import List, Optional, TypedDict

from sqlalchemy import and_, func, or_
from sqlalchemy.sql.functions import coalesce
from src.models.social.aggregate_plays import AggregatePlay
from src.models.agreements.agreement import Agreement
from src.models.agreements.agreement_route import AgreementRoute
from src.models.users.user import User
from src.queries.get_unpopulated_agreements import get_unpopulated_agreements
from src.queries.query_helpers import (
    add_query_pagination,
    add_users_to_agreements,
    get_pagination_vars,
    parse_sort_param,
    populate_agreement_metadata,
)
from src.utils import helpers, redis_connection
from src.utils.db_session import get_db_read_replica

logger = logging.getLogger(__name__)

redis = redis_connection.get_redis()


class RouteArgs(TypedDict):
    handle: str
    slug: str


class GetAgreementArgs(TypedDict):
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


def _get_agreements(session, args):
    # Create initial query
    base_query = session.query(Agreement)
    base_query = base_query.filter(Agreement.is_current == True, Agreement.stem_of == None)

    if "routes" in args:
        routes = args.get("routes")
        # Join the routes table
        base_query = base_query.join(AgreementRoute, AgreementRoute.agreement_id == Agreement.agreement_id)

        # Add the query conditions for each route
        filter_cond = []
        for route in routes:
            filter_cond.append(
                and_(
                    AgreementRoute.slug == route["slug"],
                    AgreementRoute.owner_id == route["owner_id"],
                )
            )
        base_query = base_query.filter(or_(*filter_cond))
    else:
        # Only return unlisted agreements if either
        # - above case, routes are present (direct links to hidden agreements)
        # - the user is authenticated as the owner
        is_authed_user = (
            "user_id" in args
            and "authed_user_id" in args
            and args.get("user_id") == args.get("authed_user_id")
        )
        if not is_authed_user:
            base_query = base_query.filter(Agreement.is_unlisted == False)

    # Conditionally process an array of agreements
    if "id" in args:
        agreement_id_list = args.get("id")
        try:
            # Update query with agreement_id list
            base_query = base_query.filter(Agreement.agreement_id.in_(agreement_id_list))
        except ValueError as e:
            logger.error("Invalid value found in agreement id list", exc_info=True)
            raise e

    # Allow filtering of agreements by a certain creator
    if "user_id" in args:
        user_id = args.get("user_id")
        base_query = base_query.filter(Agreement.owner_id == user_id)

    # Allow filtering of deletes
    if "filter_deleted" in args:
        filter_deleted = args.get("filter_deleted")
        if filter_deleted:
            base_query = base_query.filter(Agreement.is_delete == False)

    if "min_block_number" in args:
        min_block_number = args.get("min_block_number")
        base_query = base_query.filter(Agreement.blocknumber >= min_block_number)

    if "sort" in args:
        if args["sort"] == "date":
            base_query = base_query.order_by(
                coalesce(
                    # This func is defined in alembic migrations
                    func.to_date_safe(Agreement.release_date, "Dy Mon DD YYYY HH24:MI:SS"),
                    Agreement.created_at,
                ).desc(),
                Agreement.agreement_id.desc(),
            )
        elif args["sort"] == "plays":
            base_query = base_query.join(
                AggregatePlay, AggregatePlay.play_item_id == Agreement.agreement_id
            ).order_by(AggregatePlay.count.desc())
        else:
            whitelist_params = [
                "created_at",
                "create_date",
                "release_date",
                "blocknumber",
                "agreement_id",
            ]
            base_query = parse_sort_param(base_query, Agreement, whitelist_params)

    query_results = add_query_pagination(base_query, args["limit"], args["offset"])
    agreements = helpers.query_result_to_list(query_results.all())
    return agreements


def get_agreements(args: GetAgreementArgs):
    """
    Gets agreements.
    A note on caching strategy:
        - This method is cached at two layers: at the API via the @cache decorator,
        and within this method using the shared get_unpopulated_agreements cache.

        The shared cache only works when fetching via ID, so calls to fetch agreements
        via handle, asc/desc sort, or filtering by block_number won't hit the shared cache.
        These will hit the API cache unless they have a current_user_id included.

    """
    agreements = []

    db = get_db_read_replica()
    with db.scoped_session() as session:

        def get_agreements_and_ids():
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
                agreements = get_unpopulated_agreements(
                    session, args["id"], should_filter_deleted
                )
                agreement_ids = list(map(lambda agreement: agreement["agreement_id"], agreements))
                return (agreements, agreement_ids)

            (limit, offset) = get_pagination_vars()
            args["limit"] = limit
            args["offset"] = offset

            agreements = _get_agreements(session, args)

            agreement_ids = list(map(lambda agreement: agreement["agreement_id"], agreements))

            return (agreements, agreement_ids)

        (agreements, agreement_ids) = get_agreements_and_ids()

        # bundle peripheral info into agreement results
        current_user_id = args.get("current_user_id")

        # remove agreement segments and download cids from deactivated user agreements and deleted agreements
        for agreement in agreements:
            if agreement["user"][0]["is_deactivated"] or agreement["is_delete"]:
                agreement["agreement_segments"] = []
                if agreement["download"] is not None:
                    agreement["download"]["cid"] = None

        agreements = populate_agreement_metadata(session, agreement_ids, agreements, current_user_id)

        if args.get("with_users", False):
            add_users_to_agreements(session, agreements, current_user_id)
        else:
            # Remove the user from the agreements
            agreements = [
                {key: val for key, val in dict.items() if key != "user"}
                for dict in agreements
            ]
    return agreements
