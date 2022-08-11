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
    extend_track,
    extend_user,
    format_limit,
    format_offset,
    full_trending_parser,
    get_current_user_id,
    get_default_max,
    get_encoded_track_id,
    make_full_response,
    make_response,
    pagination_with_current_user_parser,
    search_parser,
    stem_from_track,
    success_response,
    trending_parser,
    trending_parser_paginated,
)
from src.api.v1.models.users import user_model_full
from src.queries.get_feed import get_feed
from src.queries.get_max_id import get_max_id
from src.queries.get_recommended_tracks import (
    DEFAULT_RECOMMENDED_LIMIT,
    get_full_recommended_tracks,
    get_recommended_tracks,
)
from src.queries.get_remix_track_parents import get_remix_track_parents
from src.queries.get_remixable_tracks import get_remixable_tracks
from src.queries.get_remixes_of import get_remixes_of
from src.queries.get_reposters_for_track import get_reposters_for_track
from src.queries.get_savers_for_track import get_savers_for_track
from src.queries.get_stems_of import get_stems_of
from src.queries.get_top_followee_saves import get_top_followee_saves
from src.queries.get_top_followee_windowed import get_top_followee_windowed
from src.queries.get_track_user_creator_node import get_track_user_creator_node
from src.queries.get_tracks import RouteArgs, get_tracks
from src.queries.get_tracks_including_unlisted import get_tracks_including_unlisted
from src.queries.get_trending import get_full_trending, get_trending
from src.queries.get_trending_ids import get_trending_ids
from src.queries.get_trending_tracks import TRENDING_LIMIT, TRENDING_TTL_SEC
from src.queries.get_underground_trending import get_underground_trending
from src.queries.search_queries import SearchKind, search
from src.trending_strategies.trending_strategy_factory import (
    DEFAULT_TRENDING_VERSIONS,
    TrendingStrategyFactory,
)
from src.trending_strategies.trending_type_and_version import TrendingType
from src.utils.redis_cache import cache
from src.utils.redis_metrics import record_metrics

from .models.tracks import remixes_response as remixes_response_model
from .models.tracks import stem_full, track, track_full

logger = logging.getLogger(__name__)

trending_strategy_factory = TrendingStrategyFactory()

# Models & namespaces

ns = Namespace("tracks", description="Track related operations")
full_ns = Namespace("tracks", description="Full track operations")

track_response = make_response("track_response", ns, fields.Nested(track))
full_track_response = make_full_response(
    "full_track_response", full_ns, fields.Nested(track_full)
)

tracks_response = make_response(
    "tracks_response", ns, fields.List(fields.Nested(track))
)
full_tracks_response = make_full_response(
    "full_tracks_response", full_ns, fields.List(fields.Nested(track_full))
)

# Get single track


def get_single_track(track_id, current_user_id, endpoint_ns):
    args = {
        "id": [track_id],
        "with_users": True,
        "filter_deleted": True,
        "current_user_id": current_user_id,
    }
    tracks = get_tracks(args)
    if not tracks:
        abort_not_found(track_id, endpoint_ns)
    single_track = extend_track(tracks[0])
    return success_response(single_track)


def get_unlisted_track(track_id, url_title, handle, current_user_id, endpoint_ns):
    args = {
        "identifiers": [{"handle": handle, "url_title": url_title, "id": track_id}],
        "filter_deleted": False,
        "with_users": True,
        "current_user_id": current_user_id,
    }
    tracks = get_tracks_including_unlisted(args)
    if not tracks:
        abort_not_found(track_id, endpoint_ns)
    single_track = extend_track(tracks[0])
    return success_response(single_track)


def parse_routes(routes: List[str]) -> List[RouteArgs]:
    return [
        {"handle": route.split("/")[-2], "slug": route.split("/")[-1]}
        for route in routes
    ]


TRACK_ROUTE = "/<string:track_id>"


@ns.route(TRACK_ROUTE)
class Track(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Track""",
        description="""Gets a track by ID""",
        params={"track_id": "A Track ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(track_response)
    @cache(ttl_sec=5)
    def get(self, track_id):
        decoded_id = decode_with_abort(track_id, ns)
        return get_single_track(decoded_id, None, ns)


full_track_parser = current_user_parser.copy()
full_track_parser.add_argument(
    "handle", description="The User handle of the track owner"
)
full_track_parser.add_argument(
    "url_title", description="The URLized title of the track"
)
full_track_parser.add_argument(
    "show_unlisted",
    description="Whether or not to show unlisted tracks",
    type=inputs.boolean,
)


@full_ns.route(TRACK_ROUTE)
class FullTrack(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Track""",
        description="""Gets a track by ID. If `show_unlisted` is true, then `handle` and `url_title` are required.""",
        params={
            "track_id": "A Track ID",
        },
    )
    @full_ns.expect(full_track_parser)
    @full_ns.marshal_with(full_track_response)
    @cache(ttl_sec=5)
    def get(self, track_id: str):
        args = full_track_parser.parse_args()
        decoded_id = decode_with_abort(track_id, full_ns)
        current_user_id = get_current_user_id(args)
        if args.get("show_unlisted"):
            url_title, handle = args.get("url_title"), args.get("handle")
            if not (url_title and handle):
                full_ns.abort(400, "Unlisted tracks require url_title and handle")
            return get_unlisted_track(
                decoded_id, url_title, handle, current_user_id, full_ns
            )

        return get_single_track(decoded_id, current_user_id, full_ns)


full_track_route_parser = current_user_parser.copy()
full_track_route_parser.add_argument(
    "handle",
    required=False,
    doc=False,  # Deprecated
)
full_track_route_parser.add_argument(
    "slug",
    required=False,
    doc=False,  # Deprecated
)
full_track_route_parser.add_argument(
    "route", action="append", required=False, doc=False  # Deprecated
)
full_track_route_parser.add_argument(
    "permalink",
    action="append",
    required=False,
    description="The permalink of the track(s)",
)
full_track_route_parser.add_argument(
    "id", action="append", required=False, description="The ID of the track(s)"
)

track_slug_parser = full_track_route_parser.copy()
track_slug_parser.remove_argument("user_id")


@ns.route("")
class BulkTracks(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Bulk Tracks""",
        description="""Gets a list of tracks using their IDs or permalinks""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.response(
        200, "Success", tracks_response
    )  # Manually set the expected response to be a list of tracks using using @ns.response
    @ns.expect(track_slug_parser)
    @marshal_with(
        track_response
    )  # Don't document using the marshaller - required for backwards compat supporting non-list responses
    @cache(ttl_sec=5)
    def get(self):
        args = track_slug_parser.parse_args()
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
            tracks = get_tracks({"with_users": True, "id": decode_ids_array(ids)})
        else:
            tracks = get_tracks({"with_users": True, "routes": routes_parsed})
        if not tracks:
            if handle and slug:
                abort_not_found(f"{handle}/{slug}", ns)
            elif routes:
                abort_not_found(routes, ns)
            else:
                abort_not_found(ids, ns)

        # For backwards compatibility, the old handle/slug route returned an object, not an array
        if handle and slug:
            tracks = extend_track(tracks[0])
        else:
            tracks = [extend_track(track) for track in tracks]
        return success_response(tracks)


@full_ns.route("")
class FullBulkTracks(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Bulk Tracks""",
        description="""Gets a list of tracks using their IDs or permalinks""",
    )
    @full_ns.expect(full_track_route_parser)
    @full_ns.marshal_with(full_track_response)
    @cache(ttl_sec=5)
    def get(self):
        args = full_track_route_parser.parse_args()
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
            tracks = get_tracks(
                {
                    "with_users": True,
                    "id": decode_ids_array(ids),
                    "current_user_id": current_user_id,
                }
            )
        else:
            tracks = get_tracks(
                {
                    "with_users": True,
                    "routes": routes_parsed,
                    "current_user_id": current_user_id,
                }
            )
        if not tracks:
            if handle and slug:
                abort_not_found(f"{handle}/{slug}", full_ns)
            elif routes:
                abort_not_found(routes, full_ns)
            else:
                abort_not_found(ids, full_ns)

        # For backwards compatibility, the old handle/slug route returned an object, not an array
        if handle and slug:
            tracks = extend_track(tracks[0])
        else:
            tracks = [extend_track(track) for track in tracks]
        return success_response(tracks)


# Stream


def tranform_stream_cache(stream_url):
    return redirect(stream_url)


@ns.route("/<string:track_id>/stream")
class TrackStream(Resource):
    @record_metrics
    @ns.doc(
        id="""Stream Track""",
        params={"track_id": "A Track ID"},
        responses={
            200: "Success",
            216: "Partial content",
            400: "Bad request",
            416: "Content range invalid",
            500: "Server error",
        },
    )
    @cache(ttl_sec=5, transform=tranform_stream_cache)
    def get(self, track_id):
        """
        Get the streamable MP3 file of a track

        This endpoint accepts the Range header for streaming.
        https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests
        """
        decoded_id = decode_with_abort(track_id, ns)
        args = {"track_id": decoded_id}
        creator_nodes = get_track_user_creator_node(args)
        if creator_nodes is None:
            abort_not_found(track_id, ns)
        creator_nodes = creator_nodes.split(",")
        if not creator_nodes:
            abort_not_found(track_id, ns)

        # before redirecting to content node,
        # make sure the track isn't deleted and the user isn't deactivated
        args = {
            "id": [decoded_id],
            "with_users": True,
        }
        tracks = get_tracks(args)
        track = tracks[0]
        if track["is_delete"] or track["user"]["is_deactivated"]:
            abort_not_found(track_id, ns)

        primary_node = creator_nodes[0]
        stream_url = urljoin(primary_node, f"tracks/stream/{track_id}")

        return stream_url


track_search_result = make_response(
    "track_search", ns, fields.List(fields.Nested(track))
)

track_search_parser = search_parser.copy()
track_search_parser.add_argument(
    "only_downloadable",
    required=False,
    default=False,
    description="Return only downloadable tracks",
)


@ns.route("/search")
class TrackSearchResult(Resource):
    @record_metrics
    @ns.doc(
        id="""Search Tracks""",
        description="""Search for a track or tracks""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(track_search_parser)
    @ns.marshal_with(track_search_result)
    @cache(ttl_sec=600)
    def get(self):
        args = track_search_parser.parse_args()
        query = args["query"]
        if not query:
            abort_bad_request_param("query", ns)
        search_args = {
            "query": query,
            "kind": SearchKind.tracks.name,
            "is_auto_complete": False,
            "current_user_id": None,
            "with_users": True,
            "limit": 10,
            "offset": 0,
            "only_downloadable": args["only_downloadable"],
        }
        response = search(search_args)
        return success_response(response["tracks"])


# Trending
#
# There are two trending endpoints - regular and full. Regular
# uses the familiar caching decorator, while full is more interesting.
#
# Full Trending is consumed page by page in the client, but we'd like to avoid caching
# each page seperately (to avoid old pages interleaving with new ones on the client).
# We're further constrained by the need to fetch more than the page size of ~10 in our playcount
# query in order to score + sort the tracks.
#
# We address this by always fetching and scoring `TRENDING_LIMIT` (>> page limit) tracks,
# caching the entire tracks list. This cached value is sliced by limit + offset and returned.
# This cache entry is be keyed by genre + user_id + time_range.
#
# However, this causes an issue where every distinct user_id (every logged in user) will have a cache miss
# on their first call to trending. We deal with this by adding an additional layer of caching inside
# `get_trending_tracks.py`, which caches the scored tracks before they are populated (keyed by genre + time).
# With this second cache, each user_id can reuse on the same cached list of tracks, and then populate them uniquely.


@ns.route(
    "/trending",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.TRACKS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Trending Tracks""",
            "description": """Gets the top 100 trending (most popular) tracks on Coliving""",
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
@ns.route("/trending/<string:version>", doc=False)
class Trending(Resource):
    @record_metrics
    @ns.expect(trending_parser)
    @ns.marshal_with(tracks_response)
    @cache(ttl_sec=TRENDING_TTL_SEC)
    def get(self, version):
        trending_track_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_track_versions)
        )
        if not version_list:
            abort_bad_path_param("version", ns)

        args = trending_parser.parse_args()
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.TRACKS, version_list[0]
        )
        trending_tracks = get_trending(args, strategy)
        return success_response(trending_tracks)


@full_ns.route(
    "/trending",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.TRACKS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Trending Tracks""",
            "description": """Gets the top 100 trending (most popular) tracks on Coliving""",
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
@full_ns.route(
    "/trending/<string:version>",
    doc={
        "get": {
            "id": """Get Trending Tracks With Version""",
            "description": """Gets the top 100 trending (most popular tracks on Coliving using a given trending strategy version""",
            "params": {"version": "The strategy version of trending to use"},
        }
    },
)
class FullTrending(Resource):
    @record_metrics
    @ns.doc()
    @full_ns.expect(full_trending_parser)
    @full_ns.marshal_with(full_tracks_response)
    def get(self, version):
        trending_track_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_track_versions)
        )
        if not version_list:
            abort_bad_path_param("version", full_ns)

        args = full_trending_parser.parse_args()
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.TRACKS, version_list[0]
        )
        trending_tracks = get_full_trending(request, args, strategy)
        return success_response(trending_tracks)


@full_ns.route(
    "/trending/underground",
    defaults={
        "version": DEFAULT_TRENDING_VERSIONS[TrendingType.UNDERGROUND_TRACKS].name
    },
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Underground Trending Tracks""",
            "description": """Gets the top 100 trending underground tracks on Coliving""",
        }
    },
)
@full_ns.route(
    "/trending/underground/<string:version>",
    doc={
        "get": {
            "id": "Get Underground Trending Tracks With Version",
            "description": "Gets the top 100 trending underground tracks on Coliving using a given trending strategy version",
            "params": {"version": "The strategy version of trending to user"},
        }
    },
)
class FullUndergroundTrending(Resource):
    @record_metrics
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(full_tracks_response)
    def get(self, version):
        underground_trending_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.UNDERGROUND_TRACKS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, underground_trending_versions)
        )
        if not version_list:
            abort_bad_path_param("version", full_ns)

        args = pagination_with_current_user_parser.parse_args()
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.UNDERGROUND_TRACKS, version_list[0]
        )
        trending_tracks = get_underground_trending(request, args, strategy)
        return success_response(trending_tracks)


# Get recommended tracks for a genre and exclude tracks in the exclusion list
recommended_track_parser = trending_parser_paginated.copy()
recommended_track_parser.remove_argument("offset")
recommended_track_parser.add_argument(
    "exclusion_list",
    type=int,
    action="append",
    required=False,
    description="List of track ids to exclude",
)


@ns.route(
    "/recommended",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.TRACKS].name},
    strict_slashes=False,
    doc=False,
)
@ns.route("/recommended/<string:version>", doc=False)
class RecommendedTrack(Resource):
    @record_metrics
    @ns.expect(recommended_track_parser)
    @ns.marshal_with(tracks_response)
    @cache(ttl_sec=TRENDING_TTL_SEC)
    def get(self, version):
        trending_track_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_track_versions)
        )
        if not version_list:
            abort_bad_path_param("version", ns)

        args = recommended_track_parser.parse_args()
        limit = format_limit(args, default_limit=DEFAULT_RECOMMENDED_LIMIT)
        args["limit"] = max(TRENDING_LIMIT, limit)
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.TRACKS, version_list[0]
        )
        recommended_tracks = get_recommended_tracks(args, strategy)
        return success_response(recommended_tracks[:limit])


full_recommended_track_parser = recommended_track_parser.copy()
full_recommended_track_parser.add_argument(
    "user_id", required=False, description="The user ID of the user making the request"
)


@full_ns.route(
    "/recommended",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.TRACKS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Recommended Tracks""",
            "description": """Get recommended tracks""",
        }
    },
)
@full_ns.route(
    "/recommended/<string:version>",
    doc={
        "get": {
            "id": """Get Recommended Tracks With Version""",
            "description": """Get recommended tracks using the given trending strategy version""",
            "params": {"version": "The strategy version of trending to use"},
        }
    },
)
class FullRecommendedTracks(Resource):
    @record_metrics
    @full_ns.expect(full_recommended_track_parser)
    @full_ns.marshal_with(full_tracks_response)
    def get(self, version):
        trending_track_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_track_versions)
        )
        if not version_list:
            abort_bad_path_param("version", full_ns)

        args = full_recommended_track_parser.parse_args()
        limit = format_limit(args, default_limit=DEFAULT_RECOMMENDED_LIMIT)
        args["limit"] = max(TRENDING_LIMIT, limit)
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.TRACKS, version_list[0]
        )
        full_recommended_tracks = get_full_recommended_tracks(request, args, strategy)
        return success_response(full_recommended_tracks[:limit])


trending_ids_route_parser = trending_parser.copy()
trending_ids_route_parser.remove_argument("time")

track_id = full_ns.model("track_id", {"id": fields.String(required=True)})
trending_times_ids = full_ns.model(
    "trending_times_ids",
    {
        "week": fields.List(fields.Nested(track_id)),
        "month": fields.List(fields.Nested(track_id)),
        "year": fields.List(fields.Nested(track_id)),
    },
)
trending_ids_response = make_response(
    "trending_ids_response", full_ns, fields.Nested(trending_times_ids)
)


@full_ns.route(
    "/trending/ids",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.TRACKS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Trending Track IDs""",
            "description": """Gets the track IDs of the top trending tracks on Coliving""",
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
@full_ns.route(
    "/trending/ids/<string:version>",
    doc={
        "get": {
            "id": """Get Trending Tracks IDs With Version""",
            "description": """Gets the track IDs of the top trending tracks on Coliving based on the given trending strategy version""",
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
        trending_track_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_track_versions)
        )
        if not version_list:
            abort_bad_path_param("version", full_ns)

        args = trending_ids_route_parser.parse_args()
        args["limit"] = args.get("limit", 10)
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.TRACKS, version_list[0]
        )
        trending_ids = get_trending_ids(args, strategy)
        res = {
            "week": list(map(get_encoded_track_id, trending_ids["week"])),
            "month": list(map(get_encoded_track_id, trending_ids["month"])),
            "year": list(map(get_encoded_track_id, trending_ids["year"])),
        }
        return success_response(res)


track_favorites_response = make_full_response(
    "track_favorites_response_full",
    full_ns,
    fields.List(fields.Nested(user_model_full)),
)


@full_ns.route("/<string:track_id>/favorites")
class FullTrackFavorites(Resource):
    @full_ns.doc(
        id="""Get Users From Favorites""",
        description="""Get users that favorited a track""",
        params={"track_id": "A Track ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(track_favorites_response)
    @cache(ttl_sec=5)
    def get(self, track_id):
        args = pagination_with_current_user_parser.parse_args()
        decoded_id = decode_with_abort(track_id, full_ns)
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)

        args = {
            "save_track_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        users = get_savers_for_track(args)
        users = list(map(extend_user, users))

        return success_response(users)


track_reposts_response = make_full_response(
    "track_reposts_response_full", full_ns, fields.List(fields.Nested(user_model_full))
)


@full_ns.route("/<string:track_id>/reposts")
class FullTrackReposts(Resource):
    @full_ns.doc(
        id="""Get Users From Reposts""",
        description="""Get the users that reposted a track""",
        params={"track_id": "A Track ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(track_reposts_response)
    @cache(ttl_sec=5)
    def get(self, track_id):
        args = pagination_with_current_user_parser.parse_args()
        decoded_id = decode_with_abort(track_id, full_ns)
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)

        args = {
            "repost_track_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        users = get_reposters_for_track(args)
        users = list(map(extend_user, users))
        return success_response(users)


track_stems_response = make_full_response(
    "stems_response", full_ns, fields.List(fields.Nested(stem_full))
)


@full_ns.route("/<string:track_id>/stems")
class FullTrackStems(Resource):
    @full_ns.doc(
        id="""Get Track Stems""",
        description="""Get the remixable stems of a track""",
        params={"track_id": "A Track ID"},
    )
    @full_ns.marshal_with(track_stems_response)
    @cache(ttl_sec=10)
    def get(self, track_id):
        decoded_id = decode_with_abort(track_id, full_ns)
        stems = get_stems_of(decoded_id)
        stems = list(map(stem_from_track, stems))
        return success_response(stems)


track_remixables_route_parser = pagination_with_current_user_parser.copy()
track_remixables_route_parser.remove_argument("offset")
track_remixables_route_parser.add_argument(
    "with_users",
    required=False,
    type=bool,
    description="Boolean to include user info with tracks",
)


@full_ns.route("/remixables")
class FullRemixableTracks(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Remixable Tracks""",
        description="""Gets a list of tracks that have stems available for remixing""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(track_remixables_route_parser)
    @full_ns.marshal_with(full_track_response)
    @cache(ttl_sec=5)
    def get(self):
        args = track_remixables_route_parser.parse_args()
        args = {
            "current_user_id": get_current_user_id(args),
            "limit": get_default_max(args.get("limit"), 25, 100),
            "with_users": args.get("with_users", False),
        }
        tracks = get_remixable_tracks(args)
        tracks = list(map(extend_track, tracks))
        return success_response(tracks)


remixes_response = make_full_response(
    "remixes_response_full", full_ns, fields.Nested(remixes_response_model)
)


@full_ns.route("/<string:track_id>/remixes")
class FullRemixesRoute(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Track Remixes""",
        description="""Get all tracks that remix the given track""",
        params={"track_id": "A Track ID"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(remixes_response)
    @cache(ttl_sec=10)
    def get(self, track_id):
        decoded_id = decode_with_abort(track_id, full_ns)
        request_args = pagination_with_current_user_parser.parse_args()
        current_user_id = get_current_user_id(request_args)

        args = {
            "with_users": True,
            "track_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": format_limit(request_args, default_limit=10),
            "offset": format_offset(request_args),
        }
        response = get_remixes_of(args)
        response["tracks"] = list(map(extend_track, response["tracks"]))
        return success_response(response)


remixing_response = make_full_response(
    "remixing_response", full_ns, fields.List(fields.Nested(track_full))
)


@full_ns.route("/<string:track_id>/remixing")
class FullRemixingRoute(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Track Remix Parents""",
        description="""Gets all the tracks that the given track remixes""",
        params={"track_id": "A Track ID"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(remixing_response)
    @cache(ttl_sec=10)
    def get(self, track_id):
        decoded_id = decode_with_abort(track_id, full_ns)
        request_args = pagination_with_current_user_parser.parse_args()
        current_user_id = get_current_user_id(request_args)

        args = {
            "with_users": True,
            "track_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": format_limit(request_args, default_limit=10),
            "offset": format_offset(request_args),
        }
        tracks = get_remix_track_parents(args)
        tracks = list(map(extend_track, tracks))
        return success_response(tracks)


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
    description="The number of tracks to get",
)
best_new_releases_parser.add_argument(
    "with_users",
    required=False,
    type=bool,
    description="Boolean to include user info with tracks",
)


@full_ns.route("/best_new_releases")
class BestNewReleases(Resource):
    @record_metrics
    @full_ns.doc(
        id="Best New Releases",
        description='Gets the tracks found on the "Best New Releases" smart playlist',
    )
    @full_ns.marshal_with(full_tracks_response)
    @cache(ttl_sec=10)
    def get(self):
        request_args = best_new_releases_parser.parse_args()
        window = request_args.get("window")
        args = {
            "with_users": request_args.get("with_users"),
            "limit": format_limit(request_args, 100),
            "user_id": get_current_user_id(request_args),
        }
        tracks = get_top_followee_windowed("track", window, args)
        tracks = list(map(extend_track, tracks))
        return success_response(tracks)


"""
Discovery Node Social Feed Overview
For a given user, current_user, we provide a feed of relevant content from around the coliving network.
This is generated in the following manner:
  - Generate list of users followed by current_user, known as 'followees'
  - Query all track and public playlist reposts from followees
    - Generate list of reposted track ids and reposted playlist ids
  - Query all track and public playlists reposted OR created by followees, ordered by timestamp
    - At this point, 2 separate arrays one for playlists / one for tracks
  - Query additional metadata around feed entries in each array, repost + save counts, user repost boolean
  - Combine unsorted playlist and track arrays
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
    "tracks_only",
    required=False,
    type=bool,
    description="Whether to only include tracks",
)
under_the_radar_parser.add_argument(
    "with_users",
    required=False,
    type=bool,
    description="Boolean to include user info with tracks",
)


@full_ns.route("/under_the_radar")
class UnderTheRadar(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Under the Radar Tracks""",
        description="""Gets the tracks found on the \"Under the Radar\" smart playlist""",
    )
    @full_ns.expect(under_the_radar_parser)
    @full_ns.marshal_with(full_tracks_response)
    @cache(ttl_sec=10)
    def get(self):
        request_args = under_the_radar_parser.parse_args()
        args = {
            "tracks_only": request_args.get("tracks_only"),
            "with_users": request_args.get("with_users"),
            "limit": format_limit(request_args, 100, 25),
            "offset": format_offset(request_args),
            "user_id": get_current_user_id(request_args),
            "filter": request_args.get("filter"),
        }
        feed_results = get_feed(args)
        feed_results = list(map(extend_track, feed_results))
        return success_response(feed_results)


most_loved_parser = current_user_parser.copy()
most_loved_parser.add_argument(
    "limit",
    required=False,
    default=25,
    type=int,
    description="Number of tracks to fetch",
)
most_loved_parser.add_argument(
    "with_users",
    required=False,
    type=bool,
    description="Boolean to include user info with tracks",
)


@full_ns.route("/most_loved")
class MostLoved(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Most Loved Tracks""",
        description="""Gets the tracks found on the \"Most Loved\" smart playlist""",
    )
    @full_ns.expect(most_loved_parser)
    @full_ns.marshal_with(full_tracks_response)
    @cache(ttl_sec=10)
    def get(self):
        request_args = most_loved_parser.parse_args()
        args = {
            "with_users": request_args.get("with_users"),
            "limit": format_limit(request_args, max_limit=100, default_limit=25),
            "user_id": get_current_user_id(request_args),
        }
        tracks = get_top_followee_saves("track", args)
        tracks = list(map(extend_track, tracks))
        return success_response(tracks)


@ns.route("/latest", doc=False)
class LatestTrack(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Latest Track""",
        description="""Gets the most recent track on Coliving""",
    )
    def get(self):
        latest = get_max_id("track")
        return success_response(latest)
