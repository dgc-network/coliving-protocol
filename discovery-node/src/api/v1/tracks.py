import logging  # pylint: disable=C0302
from typing import List
from urllib.parse import urljoin

from flask import redirect
from flask.globals import request
from flask_restx import Namespace, Resource, fields, inputs, marshal_with
from src.api.v1.helpers import (
    abort_bad_path_param,
    abort_bad_request_param,
    abort_not_found,
    current_user_parser,
    decode_ids_array,
    decode_with_abort,
    extend_agreement,
    extend_user,
    format_limit,
    format_offset,
    full_trending_parser,
    get_current_user_id,
    get_default_max,
    get_encoded_agreement_id,
    make_full_response,
    make_response,
    pagination_with_current_user_parser,
    search_parser,
    stem_from_agreement,
    success_response,
    trending_parser,
    trending_parser_paginated,
)
from src.api.v1.models.users import user_model_full
from src.queries.get_feed import get_feed
from src.queries.get_max_id import get_max_id
from src.queries.get_recommended_agreements import (
    DEFAULT_RECOMMENDED_LIMIT,
    get_full_recommended_agreements,
    get_recommended_agreements,
)
from src.queries.get_remix_agreement_parents import get_remix_agreement_parents
from src.queries.get_remixable_agreements import get_remixable_agreements
from src.queries.get_remixes_of import get_remixes_of
from src.queries.get_reposters_for_agreement import get_reposters_for_agreement
from src.queries.get_savers_for_agreement import get_savers_for_agreement
from src.queries.get_stems_of import get_stems_of
from src.queries.get_top_followee_saves import get_top_followee_saves
from src.queries.get_top_followee_windowed import get_top_followee_windowed
from src.queries.get_agreement_user_creator_node import get_agreement_user_creator_node
from src.queries.get_agreements import RouteArgs, get_agreements
from src.queries.get_agreements_including_unlisted import get_agreements_including_unlisted
from src.queries.get_trending import get_full_trending, get_trending
from src.queries.get_trending_ids import get_trending_ids
from src.queries.get_trending_agreements import TRENDING_LIMIT, TRENDING_TTL_SEC
from src.queries.get_underground_trending import get_underground_trending
from src.queries.search_queries import SearchKind, search
from src.trending_strategies.trending_strategy_factory import (
    DEFAULT_TRENDING_VERSIONS,
    TrendingStrategyFactory,
)
from src.trending_strategies.trending_type_and_version import TrendingType
from src.utils.redis_cache import cache
from src.utils.redis_metrics import record_metrics

from .models.agreements import remixes_response as remixes_response_model
from .models.agreements import stem_full, agreement, agreement_full

logger = logging.getLogger(__name__)

trending_strategy_factory = TrendingStrategyFactory()

# Models & namespaces

ns = Namespace("agreements", description="Agreement related operations")
full_ns = Namespace("agreements", description="Full agreement operations")

agreement_response = make_response("agreement_response", ns, fields.Nested(agreement))
full_agreement_response = make_full_response(
    "full_agreement_response", full_ns, fields.Nested(agreement_full)
)

agreements_response = make_response(
    "agreements_response", ns, fields.List(fields.Nested(agreement))
)
full_agreements_response = make_full_response(
    "full_agreements_response", full_ns, fields.List(fields.Nested(agreement_full))
)

# Get single agreement


def get_single_agreement(agreement_id, current_user_id, endpoint_ns):
    args = {
        "id": [agreement_id],
        "with_users": True,
        "filter_deleted": True,
        "current_user_id": current_user_id,
    }
    agreements = get_agreements(args)
    if not agreements:
        abort_not_found(agreement_id, endpoint_ns)
    single_agreement = extend_agreement(agreements[0])
    return success_response(single_agreement)


def get_unlisted_agreement(agreement_id, url_title, handle, current_user_id, endpoint_ns):
    args = {
        "identifiers": [{"handle": handle, "url_title": url_title, "id": agreement_id}],
        "filter_deleted": False,
        "with_users": True,
        "current_user_id": current_user_id,
    }
    agreements = get_agreements_including_unlisted(args)
    if not agreements:
        abort_not_found(agreement_id, endpoint_ns)
    single_agreement = extend_agreement(agreements[0])
    return success_response(single_agreement)


def parse_routes(routes: List[str]) -> List[RouteArgs]:
    return [
        {"handle": route.split("/")[-2], "slug": route.split("/")[-1]}
        for route in routes
    ]


AGREEMENT_ROUTE = "/<string:agreement_id>"


@ns.route(AGREEMENT_ROUTE)
class Agreement(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Agreement""",
        description="""Gets a agreement by ID""",
        params={"agreement_id": "A Agreement ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(agreement_response)
    @cache(ttl_sec=5)
    def get(self, agreement_id):
        decoded_id = decode_with_abort(agreement_id, ns)
        return get_single_agreement(decoded_id, None, ns)


full_agreement_parser = current_user_parser.copy()
full_agreement_parser.add_argument(
    "handle", description="The User handle of the agreement owner"
)
full_agreement_parser.add_argument(
    "url_title", description="The URLized title of the agreement"
)
full_agreement_parser.add_argument(
    "show_unlisted",
    description="Whether or not to show unlisted agreements",
    type=inputs.boolean,
)


@full_ns.route(AGREEMENT_ROUTE)
class FullAgreement(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Agreement""",
        description="""Gets a agreement by ID. If `show_unlisted` is true, then `handle` and `url_title` are required.""",
        params={
            "agreement_id": "A Agreement ID",
        },
    )
    @full_ns.expect(full_agreement_parser)
    @full_ns.marshal_with(full_agreement_response)
    @cache(ttl_sec=5)
    def get(self, agreement_id: str):
        args = full_agreement_parser.parse_args()
        decoded_id = decode_with_abort(agreement_id, full_ns)
        current_user_id = get_current_user_id(args)
        if args.get("show_unlisted"):
            url_title, handle = args.get("url_title"), args.get("handle")
            if not (url_title and handle):
                full_ns.abort(400, "Unlisted agreements require url_title and handle")
            return get_unlisted_agreement(
                decoded_id, url_title, handle, current_user_id, full_ns
            )

        return get_single_agreement(decoded_id, current_user_id, full_ns)


full_agreement_route_parser = current_user_parser.copy()
full_agreement_route_parser.add_argument(
    "handle",
    required=False,
    doc=False,  # Deprecated
)
full_agreement_route_parser.add_argument(
    "slug",
    required=False,
    doc=False,  # Deprecated
)
full_agreement_route_parser.add_argument(
    "route", action="append", required=False, doc=False  # Deprecated
)
full_agreement_route_parser.add_argument(
    "permalink",
    action="append",
    required=False,
    description="The permalink of the agreement(s)",
)
full_agreement_route_parser.add_argument(
    "id", action="append", required=False, description="The ID of the agreement(s)"
)

agreement_slug_parser = full_agreement_route_parser.copy()
agreement_slug_parser.remove_argument("user_id")


@ns.route("")
class BulkAgreements(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Bulk Agreements""",
        description="""Gets a list of agreements using their IDs or permalinks""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.response(
        200, "Success", agreements_response
    )  # Manually set the expected response to be a list of agreements using using @ns.response
    @ns.expect(agreement_slug_parser)
    @marshal_with(
        agreement_response
    )  # Don't document using the marshaller - required for backwards compat supporting non-list responses
    @cache(ttl_sec=5)
    def get(self):
        args = agreement_slug_parser.parse_args()
        slug, handle = (args.get("slug"), args.get("handle"))
        routes = args.get("route")
        permalinks = args.get("permalink")
        ids = args.get("id")

        routes = (routes or []) + (permalinks or [])
        if not ((slug and handle) or routes or ids):
            ns.abort(400, "Expected query param 'permalink' or 'id'")
        elif ids and (routes or (slug and handle)):
            ns.abort(
                400,
                "Ambiguous query params: Expected one of 'id', 'permalink' but not both",
            )
        routes_parsed = routes if routes else []
        try:
            routes_parsed = parse_routes(routes_parsed)
        except IndexError:
            abort_bad_request_param("permalink", ns)
        if slug and handle:
            routes_parsed.append({"handle": handle, "slug": slug})
        if ids:
            agreements = get_agreements({"with_users": True, "id": decode_ids_array(ids)})
        else:
            agreements = get_agreements({"with_users": True, "routes": routes_parsed})
        if not agreements:
            if handle and slug:
                abort_not_found(f"{handle}/{slug}", ns)
            elif routes:
                abort_not_found(routes, ns)
            else:
                abort_not_found(ids, ns)

        # For backwards compatibility, the old handle/slug route returned an object, not an array
        if handle and slug:
            agreements = extend_agreement(agreements[0])
        else:
            agreements = [extend_agreement(agreement) for agreement in agreements]
        return success_response(agreements)


@full_ns.route("")
class FullBulkAgreements(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Bulk Agreements""",
        description="""Gets a list of agreements using their IDs or permalinks""",
    )
    @full_ns.expect(full_agreement_route_parser)
    @full_ns.marshal_with(full_agreement_response)
    @cache(ttl_sec=5)
    def get(self):
        args = full_agreement_route_parser.parse_args()
        slug, handle = args.get("slug"), args.get("handle")
        routes = args.get("route")
        permalinks = args.get("permalink")
        current_user_id = get_current_user_id(args)
        ids = args.get("id")

        routes = (routes or []) + (permalinks or [])
        if not ((slug and handle) or routes or ids):
            full_ns.abort(400, "Expected query param 'permalink' or 'id'")
        elif ids and (routes or (slug and handle)):
            full_ns.abort(
                400,
                "Ambiguous query params: Expected one of 'id', 'permalink' but not both",
            )
        routes_parsed = routes if routes else []
        try:
            routes_parsed = parse_routes(routes_parsed)
        except IndexError:
            abort_bad_request_param("permalink", full_ns)
        if slug and handle:
            routes_parsed.append({"handle": handle, "slug": slug})
        if ids:
            agreements = get_agreements(
                {
                    "with_users": True,
                    "id": decode_ids_array(ids),
                    "current_user_id": current_user_id,
                }
            )
        else:
            agreements = get_agreements(
                {
                    "with_users": True,
                    "routes": routes_parsed,
                    "current_user_id": current_user_id,
                }
            )
        if not agreements:
            if handle and slug:
                abort_not_found(f"{handle}/{slug}", full_ns)
            elif routes:
                abort_not_found(routes, full_ns)
            else:
                abort_not_found(ids, full_ns)

        # For backwards compatibility, the old handle/slug route returned an object, not an array
        if handle and slug:
            agreements = extend_agreement(agreements[0])
        else:
            agreements = [extend_agreement(agreement) for agreement in agreements]
        return success_response(agreements)


# Stream


def tranform_stream_cache(stream_url):
    return redirect(stream_url)


@ns.route("/<string:agreement_id>/stream")
class AgreementStream(Resource):
    @record_metrics
    @ns.doc(
        id="""Stream Agreement""",
        params={"agreement_id": "A Agreement ID"},
        responses={
            200: "Success",
            216: "Partial content",
            400: "Bad request",
            416: "Content range invalid",
            500: "Server error",
        },
    )
    @cache(ttl_sec=5, transform=tranform_stream_cache)
    def get(self, agreement_id):
        """
        Get the streamable MP3 file of a agreement

        This endpoint accepts the Range header for streaming.
        https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests
        """
        decoded_id = decode_with_abort(agreement_id, ns)
        args = {"agreement_id": decoded_id}
        creator_nodes = get_agreement_user_creator_node(args)
        if creator_nodes is None:
            abort_not_found(agreement_id, ns)
        creator_nodes = creator_nodes.split(",")
        if not creator_nodes:
            abort_not_found(agreement_id, ns)

        # before redirecting to content node,
        # make sure the agreement isn't deleted and the user isn't deactivated
        args = {
            "id": [decoded_id],
            "with_users": True,
        }
        agreements = get_agreements(args)
        agreement = agreements[0]
        if agreement["is_delete"] or agreement["user"]["is_deactivated"]:
            abort_not_found(agreement_id, ns)

        primary_node = creator_nodes[0]
        stream_url = urljoin(primary_node, f"agreements/stream/{agreement_id}")

        return stream_url


agreement_search_result = make_response(
    "agreement_search", ns, fields.List(fields.Nested(agreement))
)

agreement_search_parser = search_parser.copy()
agreement_search_parser.add_argument(
    "only_downloadable",
    required=False,
    default=False,
    description="Return only downloadable agreements",
)


@ns.route("/search")
class AgreementSearchResult(Resource):
    @record_metrics
    @ns.doc(
        id="""Search Agreements""",
        description="""Search for a agreement or agreements""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(agreement_search_parser)
    @ns.marshal_with(agreement_search_result)
    @cache(ttl_sec=600)
    def get(self):
        args = agreement_search_parser.parse_args()
        query = args["query"]
        if not query:
            abort_bad_request_param("query", ns)
        search_args = {
            "query": query,
            "kind": SearchKind.agreements.name,
            "is_auto_complete": False,
            "current_user_id": None,
            "with_users": True,
            "limit": 10,
            "offset": 0,
            "only_downloadable": args["only_downloadable"],
        }
        response = search(search_args)
        return success_response(response["agreements"])


# Trending
#
# There are two trending endpoints - regular and full. Regular
# uses the familiar caching decorator, while full is more interesting.
#
# Full Trending is consumed page by page in the client, but we'd like to avoid caching
# each page seperately (to avoid old pages interleaving with new ones on the client).
# We're further constrained by the need to fetch more than the page size of ~10 in our playcount
# query in order to score + sort the agreements.
#
# We address this by always fetching and scoring `TRENDING_LIMIT` (>> page limit) agreements,
# caching the entire agreements list. This cached value is sliced by limit + offset and returned.
# This cache entry is be keyed by genre + user_id + time_range.
#
# However, this causes an issue where every distinct user_id (every logged in user) will have a cache miss
# on their first call to trending. We deal with this by adding an additional layer of caching inside
# `get_trending_agreements.py`, which caches the scored agreements before they are populated (keyed by genre + time).
# With this second cache, each user_id can reuse on the same cached list of agreements, and then populate them uniquely.


@ns.route(
    "/trending",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.AGREEMENTS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Trending Agreements""",
            "description": """Gets the top 100 trending (most popular) agreements on Coliving""",
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
@ns.route("/trending/<string:version>", doc=False)
class Trending(Resource):
    @record_metrics
    @ns.expect(trending_parser)
    @ns.marshal_with(agreements_response)
    @cache(ttl_sec=TRENDING_TTL_SEC)
    def get(self, version):
        trending_agreement_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.AGREEMENTS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_agreement_versions)
        )
        if not version_list:
            abort_bad_path_param("version", ns)

        args = trending_parser.parse_args()
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.AGREEMENTS, version_list[0]
        )
        trending_agreements = get_trending(args, strategy)
        return success_response(trending_agreements)


@full_ns.route(
    "/trending",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.AGREEMENTS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Trending Agreements""",
            "description": """Gets the top 100 trending (most popular) agreements on Coliving""",
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
@full_ns.route(
    "/trending/<string:version>",
    doc={
        "get": {
            "id": """Get Trending Agreements With Version""",
            "description": """Gets the top 100 trending (most popular agreements on Coliving using a given trending strategy version""",
            "params": {"version": "The strategy version of trending to use"},
        }
    },
)
class FullTrending(Resource):
    @record_metrics
    @ns.doc()
    @full_ns.expect(full_trending_parser)
    @full_ns.marshal_with(full_agreements_response)
    def get(self, version):
        trending_agreement_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.AGREEMENTS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_agreement_versions)
        )
        if not version_list:
            abort_bad_path_param("version", full_ns)

        args = full_trending_parser.parse_args()
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.AGREEMENTS, version_list[0]
        )
        trending_agreements = get_full_trending(request, args, strategy)
        return success_response(trending_agreements)


@full_ns.route(
    "/trending/underground",
    defaults={
        "version": DEFAULT_TRENDING_VERSIONS[TrendingType.UNDERGROUND_AGREEMENTS].name
    },
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Underground Trending Agreements""",
            "description": """Gets the top 100 trending underground agreements on Coliving""",
        }
    },
)
@full_ns.route(
    "/trending/underground/<string:version>",
    doc={
        "get": {
            "id": "Get Underground Trending Agreements With Version",
            "description": "Gets the top 100 trending underground agreements on Coliving using a given trending strategy version",
            "params": {"version": "The strategy version of trending to user"},
        }
    },
)
class FullUndergroundTrending(Resource):
    @record_metrics
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(full_agreements_response)
    def get(self, version):
        underground_trending_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.UNDERGROUND_AGREEMENTS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, underground_trending_versions)
        )
        if not version_list:
            abort_bad_path_param("version", full_ns)

        args = pagination_with_current_user_parser.parse_args()
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.UNDERGROUND_AGREEMENTS, version_list[0]
        )
        trending_agreements = get_underground_trending(request, args, strategy)
        return success_response(trending_agreements)


# Get recommended agreements for a genre and exclude agreements in the exclusion list
recommended_agreement_parser = trending_parser_paginated.copy()
recommended_agreement_parser.remove_argument("offset")
recommended_agreement_parser.add_argument(
    "exclusion_list",
    type=int,
    action="append",
    required=False,
    description="List of agreement ids to exclude",
)


@ns.route(
    "/recommended",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.AGREEMENTS].name},
    strict_slashes=False,
    doc=False,
)
@ns.route("/recommended/<string:version>", doc=False)
class RecommendedAgreement(Resource):
    @record_metrics
    @ns.expect(recommended_agreement_parser)
    @ns.marshal_with(agreements_response)
    @cache(ttl_sec=TRENDING_TTL_SEC)
    def get(self, version):
        trending_agreement_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.AGREEMENTS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_agreement_versions)
        )
        if not version_list:
            abort_bad_path_param("version", ns)

        args = recommended_agreement_parser.parse_args()
        limit = format_limit(args, default_limit=DEFAULT_RECOMMENDED_LIMIT)
        args["limit"] = max(TRENDING_LIMIT, limit)
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.AGREEMENTS, version_list[0]
        )
        recommended_agreements = get_recommended_agreements(args, strategy)
        return success_response(recommended_agreements[:limit])


full_recommended_agreement_parser = recommended_agreement_parser.copy()
full_recommended_agreement_parser.add_argument(
    "user_id", required=False, description="The user ID of the user making the request"
)


@full_ns.route(
    "/recommended",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.AGREEMENTS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Recommended Agreements""",
            "description": """Get recommended agreements""",
        }
    },
)
@full_ns.route(
    "/recommended/<string:version>",
    doc={
        "get": {
            "id": """Get Recommended Agreements With Version""",
            "description": """Get recommended agreements using the given trending strategy version""",
            "params": {"version": "The strategy version of trending to use"},
        }
    },
)
class FullRecommendedAgreements(Resource):
    @record_metrics
    @full_ns.expect(full_recommended_agreement_parser)
    @full_ns.marshal_with(full_agreements_response)
    def get(self, version):
        trending_agreement_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.AGREEMENTS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_agreement_versions)
        )
        if not version_list:
            abort_bad_path_param("version", full_ns)

        args = full_recommended_agreement_parser.parse_args()
        limit = format_limit(args, default_limit=DEFAULT_RECOMMENDED_LIMIT)
        args["limit"] = max(TRENDING_LIMIT, limit)
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.AGREEMENTS, version_list[0]
        )
        full_recommended_agreements = get_full_recommended_agreements(request, args, strategy)
        return success_response(full_recommended_agreements[:limit])


trending_ids_route_parser = trending_parser.copy()
trending_ids_route_parser.remove_argument("time")

agreement_id = full_ns.model("agreement_id", {"id": fields.String(required=True)})
trending_times_ids = full_ns.model(
    "trending_times_ids",
    {
        "week": fields.List(fields.Nested(agreement_id)),
        "month": fields.List(fields.Nested(agreement_id)),
        "year": fields.List(fields.Nested(agreement_id)),
    },
)
trending_ids_response = make_response(
    "trending_ids_response", full_ns, fields.Nested(trending_times_ids)
)


@full_ns.route(
    "/trending/ids",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.AGREEMENTS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Trending Agreement IDs""",
            "description": """Gets the agreement IDs of the top trending agreements on Coliving""",
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
@full_ns.route(
    "/trending/ids/<string:version>",
    doc={
        "get": {
            "id": """Get Trending Agreements IDs With Version""",
            "description": """Gets the agreement IDs of the top trending agreements on Coliving based on the given trending strategy version""",
            "params": {"version": "The strategy version of trending to use"},
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
class FullTrendingIds(Resource):
    @record_metrics
    @full_ns.expect(trending_ids_route_parser)
    @full_ns.marshal_with(trending_ids_response)
    def get(self, version):
        trending_agreement_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.AGREEMENTS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_agreement_versions)
        )
        if not version_list:
            abort_bad_path_param("version", full_ns)

        args = trending_ids_route_parser.parse_args()
        args["limit"] = args.get("limit", 10)
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.AGREEMENTS, version_list[0]
        )
        trending_ids = get_trending_ids(args, strategy)
        res = {
            "week": list(map(get_encoded_agreement_id, trending_ids["week"])),
            "month": list(map(get_encoded_agreement_id, trending_ids["month"])),
            "year": list(map(get_encoded_agreement_id, trending_ids["year"])),
        }
        return success_response(res)


agreement_favorites_response = make_full_response(
    "agreement_favorites_response_full",
    full_ns,
    fields.List(fields.Nested(user_model_full)),
)


@full_ns.route("/<string:agreement_id>/favorites")
class FullAgreementFavorites(Resource):
    @full_ns.doc(
        id="""Get Users From Favorites""",
        description="""Get users that favorited a agreement""",
        params={"agreement_id": "A Agreement ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(agreement_favorites_response)
    @cache(ttl_sec=5)
    def get(self, agreement_id):
        args = pagination_with_current_user_parser.parse_args()
        decoded_id = decode_with_abort(agreement_id, full_ns)
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)

        args = {
            "save_agreement_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        users = get_savers_for_agreement(args)
        users = list(map(extend_user, users))

        return success_response(users)


agreement_reposts_response = make_full_response(
    "agreement_reposts_response_full", full_ns, fields.List(fields.Nested(user_model_full))
)


@full_ns.route("/<string:agreement_id>/reposts")
class FullAgreementReposts(Resource):
    @full_ns.doc(
        id="""Get Users From Reposts""",
        description="""Get the users that reposted a agreement""",
        params={"agreement_id": "A Agreement ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(agreement_reposts_response)
    @cache(ttl_sec=5)
    def get(self, agreement_id):
        args = pagination_with_current_user_parser.parse_args()
        decoded_id = decode_with_abort(agreement_id, full_ns)
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)

        args = {
            "repost_agreement_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        users = get_reposters_for_agreement(args)
        users = list(map(extend_user, users))
        return success_response(users)


agreement_stems_response = make_full_response(
    "stems_response", full_ns, fields.List(fields.Nested(stem_full))
)


@full_ns.route("/<string:agreement_id>/stems")
class FullAgreementStems(Resource):
    @full_ns.doc(
        id="""Get Agreement Stems""",
        description="""Get the remixable stems of a agreement""",
        params={"agreement_id": "A Agreement ID"},
    )
    @full_ns.marshal_with(agreement_stems_response)
    @cache(ttl_sec=10)
    def get(self, agreement_id):
        decoded_id = decode_with_abort(agreement_id, full_ns)
        stems = get_stems_of(decoded_id)
        stems = list(map(stem_from_agreement, stems))
        return success_response(stems)


agreement_remixables_route_parser = pagination_with_current_user_parser.copy()
agreement_remixables_route_parser.remove_argument("offset")
agreement_remixables_route_parser.add_argument(
    "with_users",
    required=False,
    type=bool,
    description="Boolean to include user info with agreements",
)


@full_ns.route("/remixables")
class FullRemixableAgreements(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Remixable Agreements""",
        description="""Gets a list of agreements that have stems available for remixing""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(agreement_remixables_route_parser)
    @full_ns.marshal_with(full_agreement_response)
    @cache(ttl_sec=5)
    def get(self):
        args = agreement_remixables_route_parser.parse_args()
        args = {
            "current_user_id": get_current_user_id(args),
            "limit": get_default_max(args.get("limit"), 25, 100),
            "with_users": args.get("with_users", False),
        }
        agreements = get_remixable_agreements(args)
        agreements = list(map(extend_agreement, agreements))
        return success_response(agreements)


remixes_response = make_full_response(
    "remixes_response_full", full_ns, fields.Nested(remixes_response_model)
)


@full_ns.route("/<string:agreement_id>/remixes")
class FullRemixesRoute(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Agreement Remixes""",
        description="""Get all agreements that remix the given agreement""",
        params={"agreement_id": "A Agreement ID"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(remixes_response)
    @cache(ttl_sec=10)
    def get(self, agreement_id):
        decoded_id = decode_with_abort(agreement_id, full_ns)
        request_args = pagination_with_current_user_parser.parse_args()
        current_user_id = get_current_user_id(request_args)

        args = {
            "with_users": True,
            "agreement_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": format_limit(request_args, default_limit=10),
            "offset": format_offset(request_args),
        }
        response = get_remixes_of(args)
        response["agreements"] = list(map(extend_agreement, response["agreements"]))
        return success_response(response)


remixing_response = make_full_response(
    "remixing_response", full_ns, fields.List(fields.Nested(agreement_full))
)


@full_ns.route("/<string:agreement_id>/remixing")
class FullRemixingRoute(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Agreement Remix Parents""",
        description="""Gets all the agreements that the given agreement remixes""",
        params={"agreement_id": "A Agreement ID"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(remixing_response)
    @cache(ttl_sec=10)
    def get(self, agreement_id):
        decoded_id = decode_with_abort(agreement_id, full_ns)
        request_args = pagination_with_current_user_parser.parse_args()
        current_user_id = get_current_user_id(request_args)

        args = {
            "with_users": True,
            "agreement_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": format_limit(request_args, default_limit=10),
            "offset": format_offset(request_args),
        }
        agreements = get_remix_agreement_parents(args)
        agreements = list(map(extend_agreement, agreements))
        return success_response(agreements)


"""
  Gets a windowed (over a certain timerange) view into the "top" of a certain type
  amongst followees. Requires an account.
  This endpoint is useful in generating views like:
      - New releases

  Args:
      window: (string) The window from now() to look back over. Supports  all standard SqlAlchemy interval notation (week, month, year, etc.).
      limit?: (number) default=25, max=100
"""
best_new_releases_parser = current_user_parser.copy()
best_new_releases_parser.add_argument(
    "window", required=True, choices=("week", "month", "year"), type=str
)
best_new_releases_parser.add_argument(
    "limit",
    required=False,
    default=25,
    type=int,
    description="The number of agreements to get",
)
best_new_releases_parser.add_argument(
    "with_users",
    required=False,
    type=bool,
    description="Boolean to include user info with agreements",
)


@full_ns.route("/best_new_releases")
class BestNewReleases(Resource):
    @record_metrics
    @full_ns.doc(
        id="Best New Releases",
        description='Gets the agreements found on the "Best New Releases" smart playlist',
    )
    @full_ns.marshal_with(full_agreements_response)
    @cache(ttl_sec=10)
    def get(self):
        request_args = best_new_releases_parser.parse_args()
        window = request_args.get("window")
        args = {
            "with_users": request_args.get("with_users"),
            "limit": format_limit(request_args, 100),
            "user_id": get_current_user_id(request_args),
        }
        agreements = get_top_followee_windowed("agreement", window, args)
        agreements = list(map(extend_agreement, agreements))
        return success_response(agreements)


"""
Discovery Node Social Feed Overview
For a given user, current_user, we provide a feed of relevant content from around the coliving network.
This is generated in the following manner:
  - Generate list of users followed by current_user, known as 'followees'
  - Query all agreement and public playlist reposts from followees
    - Generate list of reposted agreement ids and reposted playlist ids
  - Query all agreement and public playlists reposted OR created by followees, ordered by timestamp
    - At this point, 2 separate arrays one for playlists / one for agreements
  - Query additional metadata around feed entries in each array, repost + save counts, user repost boolean
  - Combine unsorted playlist and agreement arrays
  - Sort combined results by 'timestamp' field and return
"""

under_the_radar_parser = pagination_with_current_user_parser.copy()
under_the_radar_parser.add_argument(
    "filter",
    required=False,
    default="all",
    choices=("all", "repost", "original"),
    type=str,
    description="Filters for activity that is original vs reposts",
)
under_the_radar_parser.add_argument(
    "agreements_only",
    required=False,
    type=bool,
    description="Whether to only include agreements",
)
under_the_radar_parser.add_argument(
    "with_users",
    required=False,
    type=bool,
    description="Boolean to include user info with agreements",
)


@full_ns.route("/under_the_radar")
class UnderTheRadar(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Under the Radar Agreements""",
        description="""Gets the agreements found on the \"Under the Radar\" smart playlist""",
    )
    @full_ns.expect(under_the_radar_parser)
    @full_ns.marshal_with(full_agreements_response)
    @cache(ttl_sec=10)
    def get(self):
        request_args = under_the_radar_parser.parse_args()
        args = {
            "agreements_only": request_args.get("agreements_only"),
            "with_users": request_args.get("with_users"),
            "limit": format_limit(request_args, 100, 25),
            "offset": format_offset(request_args),
            "user_id": get_current_user_id(request_args),
            "filter": request_args.get("filter"),
        }
        feed_results = get_feed(args)
        feed_results = list(map(extend_agreement, feed_results))
        return success_response(feed_results)


most_loved_parser = current_user_parser.copy()
most_loved_parser.add_argument(
    "limit",
    required=False,
    default=25,
    type=int,
    description="Number of agreements to fetch",
)
most_loved_parser.add_argument(
    "with_users",
    required=False,
    type=bool,
    description="Boolean to include user info with agreements",
)


@full_ns.route("/most_loved")
class MostLoved(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Most Loved Agreements""",
        description="""Gets the agreements found on the \"Most Loved\" smart playlist""",
    )
    @full_ns.expect(most_loved_parser)
    @full_ns.marshal_with(full_agreements_response)
    @cache(ttl_sec=10)
    def get(self):
        request_args = most_loved_parser.parse_args()
        args = {
            "with_users": request_args.get("with_users"),
            "limit": format_limit(request_args, max_limit=100, default_limit=25),
            "user_id": get_current_user_id(request_args),
        }
        agreements = get_top_followee_saves("agreement", args)
        agreements = list(map(extend_agreement, agreements))
        return success_response(agreements)


@ns.route("/latest", doc=False)
class LatestAgreement(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Latest Agreement""",
        description="""Gets the most recent agreement on Coliving""",
    )
    def get(self):
        latest = get_max_id("agreement")
        return success_response(latest)
