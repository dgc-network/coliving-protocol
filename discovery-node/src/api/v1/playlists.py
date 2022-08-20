import logging

from flask.globals import request
from flask_restx import Namespace, Resource, fields
from src.api.v1.helpers import (
    abort_bad_path_param,
    abort_bad_request_param,
    current_user_parser,
    decode_with_abort,
    extend_contentList,
    extend_agreement,
    extend_user,
    full_trending_parser,
    get_current_user_id,
    get_default_max,
    make_full_response,
    make_response,
    pagination_parser,
    pagination_with_current_user_parser,
    search_parser,
    success_response,
    trending_parser,
)
from src.api.v1.models.contentLists import full_contentList_model, contentList_model
from src.api.v1.models.users import user_model_full
from src.queries.get_contentList_agreements import get_contentList_agreements
from src.queries.get_contentLists import get_contentLists
from src.queries.get_reposters_for_contentList import get_reposters_for_contentList
from src.queries.get_savers_for_contentList import get_savers_for_contentList
from src.queries.get_top_contentLists import get_top_contentLists  # pylint: disable=C0302
from src.queries.get_trending_contentLists import (
    TRENDING_LIMIT,
    TRENDING_TTL_SEC,
    get_full_trending_contentLists,
    get_trending_contentLists,
)
from src.queries.search_queries import SearchKind, search
from src.trending_strategies.trending_strategy_factory import (
    DEFAULT_TRENDING_VERSIONS,
    TrendingStrategyFactory,
)
from src.trending_strategies.trending_type_and_version import TrendingType
from src.utils.db_session import get_db_read_replica
from src.utils.redis_cache import cache
from src.utils.redis_metrics import record_metrics

from .models.agreements import agreement

logger = logging.getLogger(__name__)

trending_strategy_factory = TrendingStrategyFactory()

ns = Namespace("contentLists", description="ContentList related operations")
full_ns = Namespace("contentLists", description="Full contentList related operations")

contentLists_response = make_response(
    "contentList_response", ns, fields.List(fields.Nested(contentList_model))
)
full_contentLists_response = make_full_response(
    "full_contentList_response", full_ns, fields.List(fields.Nested(full_contentList_model))
)

contentLists_with_score = ns.clone(
    "contentList_full",
    full_contentList_model,
    {"score": fields.Float},
)

full_contentLists_with_score_response = make_full_response(
    "full_contentList_with_score_response",
    full_ns,
    fields.List(fields.Nested(contentLists_with_score)),
)


def get_contentList(contentList_id, current_user_id):
    """Returns a single contentList, or None"""
    args = {
        "contentList_id": [contentList_id],
        "with_users": True,
        "current_user_id": current_user_id,
    }
    contentLists = get_contentLists(args)
    if contentLists:
        return extend_contentList(contentLists[0])
    return None


def get_agreements_for_contentList(contentList_id, current_user_id=None):
    db = get_db_read_replica()
    with db.scoped_session() as session:
        args = {
            "contentList_ids": [contentList_id],
            "populate_agreements": True,
            "current_user_id": current_user_id,
        }
        contentList_agreements_map = get_contentList_agreements(session, args)
        contentList_agreements = contentList_agreements_map[contentList_id]
        agreements = list(map(extend_agreement, contentList_agreements))
        return agreements


CONTENT_LIST_ROUTE = "/<string:contentList_id>"


@ns.route(CONTENT_LIST_ROUTE)
class ContentList(Resource):
    @record_metrics
    @ns.doc(
        id="""Get ContentList""",
        description="""Get a contentList by ID""",
        params={"contentList_id": "A ContentList ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(contentLists_response)
    @cache(ttl_sec=5)
    def get(self, contentList_id):
        contentList_id = decode_with_abort(contentList_id, ns)
        contentList = get_contentList(contentList_id, None)
        response = success_response([contentList] if contentList else [])
        return response


contentList_agreements_response = make_response(
    "contentList_agreements_response", ns, fields.List(fields.Nested(agreement))
)


@full_ns.route(CONTENT_LIST_ROUTE)
class FullContentList(Resource):
    @ns.doc(
        id="""Get ContentList""",
        description="""Get a contentList by ID""",
        params={"contentList_id": "A ContentList ID"},
    )
    @ns.expect(current_user_parser)
    @ns.marshal_with(full_contentLists_response)
    @cache(ttl_sec=5)
    def get(self, contentList_id):
        contentList_id = decode_with_abort(contentList_id, full_ns)
        args = current_user_parser.parse_args()
        current_user_id = get_current_user_id(args)

        contentList = get_contentList(contentList_id, current_user_id)
        if contentList:
            agreements = get_agreements_for_contentList(contentList_id, current_user_id)
            contentList["agreements"] = agreements
        response = success_response([contentList] if contentList else [])
        return response


@ns.route("/<string:contentList_id>/agreements")
class ContentListAgreements(Resource):
    @record_metrics
    @ns.doc(
        id="""Get ContentList Agreements""",
        description="""Fetch agreements within a contentList.""",
        params={"contentList_id": "A ContentList ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(contentList_agreements_response)
    @cache(ttl_sec=5)
    def get(self, contentList_id):
        decoded_id = decode_with_abort(contentList_id, ns)
        agreements = get_agreements_for_contentList(decoded_id)
        return success_response(agreements)


contentList_search_result = make_response(
    "contentList_search_result", ns, fields.List(fields.Nested(contentList_model))
)


@ns.route("/search")
class ContentListSearchResult(Resource):
    @record_metrics
    @ns.doc(
        id="""Search ContentLists""",
        description="""Search for a contentList""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(search_parser)
    @ns.marshal_with(contentList_search_result)
    @cache(ttl_sec=600)
    def get(self):
        args = search_parser.parse_args()
        query = args["query"]
        if not query:
            abort_bad_request_param("query", ns)
        search_args = {
            "query": query,
            "kind": SearchKind.contentLists.name,
            "is_auto_complete": False,
            "current_user_id": None,
            "with_users": True,
            "limit": 10,
            "offset": 0,
        }
        response = search(search_args)
        return success_response(response["contentLists"])


top_parser = pagination_parser.copy()
top_parser.add_argument(
    "type",
    required=True,
    choices=("album", "contentList"),
    description="The collection type",
)
top_parser.add_argument(
    "mood",
    required=False,
    description="Filer to a mood",
)


@full_ns.route("/top", doc=False)
class Top(Resource):
    @record_metrics
    @ns.doc(id="""Top ContentLists""", description="""Gets top contentLists.""")
    @ns.marshal_with(full_contentLists_with_score_response)
    @cache(ttl_sec=30 * 60)
    def get(self):
        args = top_parser.parse_args()
        if args.get("limit") is None:
            args["limit"] = 100
        else:
            args["limit"] = min(args.get("limit"), 100)
        if args.get("offset") is None:
            args["offset"] = 0
        if args.get("type") not in ["album", "contentList"]:
            abort_bad_request_param("type", ns)

        args["with_users"] = True

        response = get_top_contentLists(args.type, args)

        contentLists = list(map(extend_contentList, response))
        return success_response(contentLists)


contentList_favorites_response = make_full_response(
    "following_response", full_ns, fields.List(fields.Nested(user_model_full))
)


@full_ns.route("/<string:contentList_id>/favorites")
class FullAgreementFavorites(Resource):
    @full_ns.doc(
        id="""Get Users From ContentList Favorites""",
        description="""Get users that favorited a contentList""",
        params={"contentList_id": "A ContentList ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(contentList_favorites_response)
    @cache(ttl_sec=5)
    def get(self, contentList_id):
        args = pagination_with_current_user_parser.parse_args()
        decoded_id = decode_with_abort(contentList_id, full_ns)
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)
        args = {
            "save_contentList_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        users = get_savers_for_contentList(args)
        users = list(map(extend_user, users))

        return success_response(users)


contentList_reposts_response = make_full_response(
    "following_response", full_ns, fields.List(fields.Nested(user_model_full))
)


@full_ns.route("/<string:contentList_id>/reposts")
class FullContentListReposts(Resource):
    @full_ns.doc(
        id="""Get Users From ContentList Reposts""",
        description="""Get users that reposted a contentList""",
        params={"contentList_id": "A ContentList ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(contentList_reposts_response)
    @cache(ttl_sec=5)
    def get(self, contentList_id):
        args = pagination_with_current_user_parser.parse_args()
        decoded_id = decode_with_abort(contentList_id, full_ns)
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)
        args = {
            "repost_contentList_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        users = get_reposters_for_contentList(args)
        users = list(map(extend_user, users))
        return success_response(users)


trending_response = make_response(
    "trending_contentLists_response", ns, fields.List(fields.Nested(contentList_model))
)
trending_contentList_parser = trending_parser.copy()
trending_contentList_parser.remove_argument("genre")


@ns.route(
    "/trending",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.CONTENT_LISTS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Trending ContentLists""",
            "description": """Gets trending contentLists for a time period""",
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
@ns.route("/trending/<string:version>", doc=False)
class TrendingContentLists(Resource):
    @record_metrics
    @ns.expect(trending_contentList_parser)
    @ns.marshal_with(trending_response)
    @cache(ttl_sec=TRENDING_TTL_SEC)
    def get(self, version):
        trending_contentList_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.CONTENT_LISTS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_contentList_versions)
        )
        if not version_list:
            abort_bad_path_param("version", ns)

        args = trending_contentList_parser.parse_args()
        time = args.get("time")
        time = "week" if time not in ["week", "month", "year"] else time
        args = {"time": time, "with_agreements": False}
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.CONTENT_LISTS, version_list[0]
        )
        contentLists = get_trending_contentLists(args, strategy)
        contentLists = contentLists[:TRENDING_LIMIT]
        contentLists = list(map(extend_contentList, contentLists))

        return success_response(contentLists)


full_trending_contentLists_response = make_full_response(
    "full_trending_contentLists_response",
    full_ns,
    fields.List(fields.Nested(full_contentList_model)),
)

full_trending_contentList_parser = full_trending_parser.copy()
full_trending_contentList_parser.remove_argument("genre")


@full_ns.route(
    "/trending",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.CONTENT_LISTS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Trending ContentLists""",
            "description": """Returns trending contentLists for a time period""",
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
@full_ns.route(
    "/trending/<string:version>",
    doc={
        "get": {
            "id": """Get Trending ContentLists With Version""",
            "description": """Returns trending contentLists for a time period based on the given trending version""",
            "params": {"version": "The strategy version of trending to use"},
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
class FullTrendingContentLists(Resource):
    @record_metrics
    @full_ns.expect(full_trending_contentList_parser)
    @full_ns.marshal_with(full_trending_contentLists_response)
    def get(self, version):
        trending_contentList_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.CONTENT_LISTS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_contentList_versions)
        )
        if not version_list:
            abort_bad_path_param("version", full_ns)

        args = full_trending_contentList_parser.parse_args()
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.CONTENT_LISTS, version_list[0]
        )
        contentLists = get_full_trending_contentLists(request, args, strategy)
        return success_response(contentLists)
