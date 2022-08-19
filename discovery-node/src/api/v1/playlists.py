import logging

from flask.globals import request
from flask_restx import Namespace, Resource, fields
from src.api.v1.helpers import (
    abort_bad_path_param,
    abort_bad_request_param,
    current_user_parser,
    decode_with_abort,
    extend_playlist,
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
from src.api.v1.models.playlists import full_playlist_model, playlist_model
from src.api.v1.models.users import user_model_full
from src.queries.get_playlist_agreements import get_playlist_agreements
from src.queries.get_playlists import get_playlists
from src.queries.get_reposters_for_playlist import get_reposters_for_playlist
from src.queries.get_savers_for_playlist import get_savers_for_playlist
from src.queries.get_top_playlists import get_top_playlists  # pylint: disable=C0302
from src.queries.get_trending_playlists import (
    TRENDING_LIMIT,
    TRENDING_TTL_SEC,
    get_full_trending_playlists,
    get_trending_playlists,
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

ns = Namespace("playlists", description="Playlist related operations")
full_ns = Namespace("playlists", description="Full playlist related operations")

playlists_response = make_response(
    "playlist_response", ns, fields.List(fields.Nested(playlist_model))
)
full_playlists_response = make_full_response(
    "full_playlist_response", full_ns, fields.List(fields.Nested(full_playlist_model))
)

playlists_with_score = ns.clone(
    "playlist_full",
    full_playlist_model,
    {"score": fields.Float},
)

full_playlists_with_score_response = make_full_response(
    "full_playlist_with_score_response",
    full_ns,
    fields.List(fields.Nested(playlists_with_score)),
)


def get_playlist(playlist_id, current_user_id):
    """Returns a single playlist, or None"""
    args = {
        "playlist_id": [playlist_id],
        "with_users": True,
        "current_user_id": current_user_id,
    }
    playlists = get_playlists(args)
    if playlists:
        return extend_playlist(playlists[0])
    return None


def get_agreements_for_playlist(playlist_id, current_user_id=None):
    db = get_db_read_replica()
    with db.scoped_session() as session:
        args = {
            "playlist_ids": [playlist_id],
            "populate_agreements": True,
            "current_user_id": current_user_id,
        }
        playlist_agreements_map = get_playlist_agreements(session, args)
        playlist_agreements = playlist_agreements_map[playlist_id]
        agreements = list(map(extend_agreement, playlist_agreements))
        return agreements


PLAYLIST_ROUTE = "/<string:playlist_id>"


@ns.route(PLAYLIST_ROUTE)
class Playlist(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Playlist""",
        description="""Get a playlist by ID""",
        params={"playlist_id": "A Playlist ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(playlists_response)
    @cache(ttl_sec=5)
    def get(self, playlist_id):
        playlist_id = decode_with_abort(playlist_id, ns)
        playlist = get_playlist(playlist_id, None)
        response = success_response([playlist] if playlist else [])
        return response


playlist_agreements_response = make_response(
    "playlist_agreements_response", ns, fields.List(fields.Nested(agreement))
)


@full_ns.route(PLAYLIST_ROUTE)
class FullPlaylist(Resource):
    @ns.doc(
        id="""Get Playlist""",
        description="""Get a playlist by ID""",
        params={"playlist_id": "A Playlist ID"},
    )
    @ns.expect(current_user_parser)
    @ns.marshal_with(full_playlists_response)
    @cache(ttl_sec=5)
    def get(self, playlist_id):
        playlist_id = decode_with_abort(playlist_id, full_ns)
        args = current_user_parser.parse_args()
        current_user_id = get_current_user_id(args)

        playlist = get_playlist(playlist_id, current_user_id)
        if playlist:
            agreements = get_agreements_for_playlist(playlist_id, current_user_id)
            playlist["agreements"] = agreements
        response = success_response([playlist] if playlist else [])
        return response


@ns.route("/<string:playlist_id>/agreements")
class PlaylistAgreements(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Playlist Agreements""",
        description="""Fetch agreements within a playlist.""",
        params={"playlist_id": "A Playlist ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(playlist_agreements_response)
    @cache(ttl_sec=5)
    def get(self, playlist_id):
        decoded_id = decode_with_abort(playlist_id, ns)
        agreements = get_agreements_for_playlist(decoded_id)
        return success_response(agreements)


playlist_search_result = make_response(
    "playlist_search_result", ns, fields.List(fields.Nested(playlist_model))
)


@ns.route("/search")
class PlaylistSearchResult(Resource):
    @record_metrics
    @ns.doc(
        id="""Search Playlists""",
        description="""Search for a playlist""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(search_parser)
    @ns.marshal_with(playlist_search_result)
    @cache(ttl_sec=600)
    def get(self):
        args = search_parser.parse_args()
        query = args["query"]
        if not query:
            abort_bad_request_param("query", ns)
        search_args = {
            "query": query,
            "kind": SearchKind.playlists.name,
            "is_auto_complete": False,
            "current_user_id": None,
            "with_users": True,
            "limit": 10,
            "offset": 0,
        }
        response = search(search_args)
        return success_response(response["playlists"])


top_parser = pagination_parser.copy()
top_parser.add_argument(
    "type",
    required=True,
    choices=("album", "playlist"),
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
    @ns.doc(id="""Top Playlists""", description="""Gets top playlists.""")
    @ns.marshal_with(full_playlists_with_score_response)
    @cache(ttl_sec=30 * 60)
    def get(self):
        args = top_parser.parse_args()
        if args.get("limit") is None:
            args["limit"] = 100
        else:
            args["limit"] = min(args.get("limit"), 100)
        if args.get("offset") is None:
            args["offset"] = 0
        if args.get("type") not in ["album", "playlist"]:
            abort_bad_request_param("type", ns)

        args["with_users"] = True

        response = get_top_playlists(args.type, args)

        playlists = list(map(extend_playlist, response))
        return success_response(playlists)


playlist_favorites_response = make_full_response(
    "following_response", full_ns, fields.List(fields.Nested(user_model_full))
)


@full_ns.route("/<string:playlist_id>/favorites")
class FullAgreementFavorites(Resource):
    @full_ns.doc(
        id="""Get Users From Playlist Favorites""",
        description="""Get users that favorited a playlist""",
        params={"playlist_id": "A Playlist ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(playlist_favorites_response)
    @cache(ttl_sec=5)
    def get(self, playlist_id):
        args = pagination_with_current_user_parser.parse_args()
        decoded_id = decode_with_abort(playlist_id, full_ns)
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)
        args = {
            "save_playlist_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        users = get_savers_for_playlist(args)
        users = list(map(extend_user, users))

        return success_response(users)


playlist_reposts_response = make_full_response(
    "following_response", full_ns, fields.List(fields.Nested(user_model_full))
)


@full_ns.route("/<string:playlist_id>/reposts")
class FullPlaylistReposts(Resource):
    @full_ns.doc(
        id="""Get Users From Playlist Reposts""",
        description="""Get users that reposted a playlist""",
        params={"playlist_id": "A Playlist ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(playlist_reposts_response)
    @cache(ttl_sec=5)
    def get(self, playlist_id):
        args = pagination_with_current_user_parser.parse_args()
        decoded_id = decode_with_abort(playlist_id, full_ns)
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)
        args = {
            "repost_playlist_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        users = get_reposters_for_playlist(args)
        users = list(map(extend_user, users))
        return success_response(users)


trending_response = make_response(
    "trending_playlists_response", ns, fields.List(fields.Nested(playlist_model))
)
trending_playlist_parser = trending_parser.copy()
trending_playlist_parser.remove_argument("genre")


@ns.route(
    "/trending",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.PLAYLISTS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Trending Playlists""",
            "description": """Gets trending playlists for a time period""",
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
@ns.route("/trending/<string:version>", doc=False)
class TrendingPlaylists(Resource):
    @record_metrics
    @ns.expect(trending_playlist_parser)
    @ns.marshal_with(trending_response)
    @cache(ttl_sec=TRENDING_TTL_SEC)
    def get(self, version):
        trending_playlist_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.PLAYLISTS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_playlist_versions)
        )
        if not version_list:
            abort_bad_path_param("version", ns)

        args = trending_playlist_parser.parse_args()
        time = args.get("time")
        time = "week" if time not in ["week", "month", "year"] else time
        args = {"time": time, "with_agreements": False}
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.PLAYLISTS, version_list[0]
        )
        playlists = get_trending_playlists(args, strategy)
        playlists = playlists[:TRENDING_LIMIT]
        playlists = list(map(extend_playlist, playlists))

        return success_response(playlists)


full_trending_playlists_response = make_full_response(
    "full_trending_playlists_response",
    full_ns,
    fields.List(fields.Nested(full_playlist_model)),
)

full_trending_playlist_parser = full_trending_parser.copy()
full_trending_playlist_parser.remove_argument("genre")


@full_ns.route(
    "/trending",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.PLAYLISTS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Trending Playlists""",
            "description": """Returns trending playlists for a time period""",
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
@full_ns.route(
    "/trending/<string:version>",
    doc={
        "get": {
            "id": """Get Trending Playlists With Version""",
            "description": """Returns trending playlists for a time period based on the given trending version""",
            "params": {"version": "The strategy version of trending to use"},
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
class FullTrendingPlaylists(Resource):
    @record_metrics
    @full_ns.expect(full_trending_playlist_parser)
    @full_ns.marshal_with(full_trending_playlists_response)
    def get(self, version):
        trending_playlist_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.PLAYLISTS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_playlist_versions)
        )
        if not version_list:
            abort_bad_path_param("version", full_ns)

        args = full_trending_playlist_parser.parse_args()
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.PLAYLISTS, version_list[0]
        )
        playlists = get_full_trending_playlists(request, args, strategy)
        return success_response(playlists)
