import concurrent.futures
import logging  # pylint: disable=C0302
import os
from enum import Enum
from functools import cmp_to_key

import sqlalchemy
from flask import Blueprint, request
from src import api_helpers, exceptions
from src.api.v1.helpers import extend_search
from src.models.social.follow import Follow
from src.models.social.repost import RepostType
from src.models.social.save import Save, SaveType
from src.queries import response_name_constants
from src.queries.get_unpopulated_playlists import get_unpopulated_playlists
from src.queries.get_unpopulated_tracks import get_unpopulated_tracks
from src.queries.get_unpopulated_users import get_unpopulated_users
from src.queries.query_helpers import (
    get_current_user_id,
    get_pagination_vars,
    get_users_by_id,
    get_users_ids,
    populate_playlist_metadata,
    populate_track_metadata,
    populate_user_metadata,
)
from src.queries.search_config import (
    current_user_saved_match_boost,
    search_handle_exact_match_boost,
    search_repost_weight,
    search_similarity_weight,
    search_title_exact_match_boost,
    search_title_weight,
    search_user_name_exact_match_boost,
    search_user_name_weight,
    user_follower_weight,
    user_handle_exact_match_boost,
    user_name_weight,
)
from src.queries.search_es import search_es_full, search_tags_es
from src.queries.search_track_tags import search_track_tags
from src.queries.search_user_tags import search_user_tags
from src.utils.db_session import get_db_read_replica

logger = logging.getLogger(__name__)
bp = Blueprint("search_tags", __name__)


# ####### VARS ####### #


class SearchKind(Enum):
    all = 1
    tracks = 2
    users = 3
    playlists = 4
    albums = 5


# ####### UTILS ####### #


def compare_users(user1, user2):
    """Comparison util for ordering user search results."""
    # Any verified user is ranked higher
    if user1["is_verified"] and not user2["is_verified"]:
        return -1
    if user2["is_verified"] and not user1["is_verified"]:
        return 1
    return 0


# ####### ROUTES ####### #


@bp.route("/search/tags", methods=("GET",))
def search_tags():
    search_str = request.args.get("query", type=str)
    current_user_id = get_current_user_id(required=False)
    if not search_str:
        raise exceptions.ArgumentError("Invalid value for parameter 'query'")

    user_tag_count = request.args.get("user_tag_count", type=str)
    if not user_tag_count:
        user_tag_count = "2"

    kind = request.args.get("kind", type=str, default="all")
    validSearchKinds = [SearchKind.all, SearchKind.tracks, SearchKind.users]
    try:
        searchKind = SearchKind[kind]
        if searchKind not in validSearchKinds:
            raise Exception
    except Exception:
        return api_helpers.error_response(
            f"Invalid value for parameter 'kind' must be in {[k.name for k in validSearchKinds]}",
            400,
        )

    results = {}

    (limit, offset) = get_pagination_vars()

    if os.getenv("audius_elasticsearch_search_enabled"):
        hits = search_tags_es(search_str, kind, current_user_id, limit, offset)
        return api_helpers.success_response(hits)

    db = get_db_read_replica()
    with db.scoped_session() as session:
        if searchKind in [SearchKind.all, SearchKind.tracks]:
            results["tracks"] = search_track_tags(
                session,
                {
                    "search_str": search_str,
                    "current_user_id": current_user_id,
                    "limit": limit,
                    "offset": offset,
                },
            )

        if searchKind in [SearchKind.all, SearchKind.users]:
            results["users"] = search_user_tags(
                session,
                {
                    "search_str": search_str,
                    "current_user_id": current_user_id,
                    "user_tag_count": user_tag_count,
                    "limit": limit,
                    "offset": offset,
                },
            )

    # Add personalized results for a given user
    if current_user_id:
        if searchKind in [SearchKind.all, SearchKind.tracks]:
            # Query saved tracks for the current user that contain this tag
            track_ids = [track["track_id"] for track in results["tracks"]]

            saves_query = (
                session.query(Save.save_item_id)
                .filter(
                    Save.is_current == True,
                    Save.is_delete == False,
                    Save.save_type == SaveType.track,
                    Save.user_id == current_user_id,
                    Save.save_item_id.in_(track_ids),
                )
                .all()
            )
            saved_track_ids = {i[0] for i in saves_query}
            saved_tracks = list(
                filter(
                    lambda track: track["track_id"] in saved_track_ids,
                    results["tracks"],
                )
            )
            results["saved_tracks"] = saved_tracks

        if searchKind in [SearchKind.all, SearchKind.users]:
            # Query followed users that have referenced this tag
            user_ids = [user["user_id"] for user in results["users"]]
            followed_user_query = (
                session.query(Follow.followee_user_id)
                .filter(
                    Follow.is_current == True,
                    Follow.is_delete == False,
                    Follow.follower_user_id == current_user_id,
                    Follow.followee_user_id.in_(user_ids),
                )
                .all()
            )
            followed_user_ids = {i[0] for i in followed_user_query}
            followed_users = list(
                filter(
                    lambda user: user["user_id"] in followed_user_ids, results["users"]
                )
            )
            results["followed_users"] = followed_users

    return api_helpers.success_response(results)


def add_users(session, results):
    user_id_list = get_users_ids(results)
    users = get_users_by_id(session, user_id_list)
    for result in results:
        user_id = None
        if "playlist_owner_id" in result:
            user_id = result["playlist_owner_id"]
        elif "owner_id" in result:
            user_id = result["owner_id"]

        if user_id is not None:
            user = users[user_id]
            result["user"] = user
    return results


def perform_search_query(db, search_type, args):
    """Performs a search query of a given `search_type`. Handles it's own session. Used concurrently."""
    with db.scoped_session() as session:
        search_str = args.get("search_str")
        limit = args.get("limit")
        offset = args.get("offset")
        is_auto_complete = args.get("is_auto_complete")
        current_user_id = args.get("current_user_id")
        only_downloadable = args.get("only_downloadable")

        results = None
        if search_type == "tracks":
            results = track_search_query(
                session,
                search_str,
                limit,
                offset,
                is_auto_complete,
                current_user_id,
                only_downloadable,
            )
        elif search_type == "users":
            results = user_search_query(
                session,
                search_str,
                limit,
                offset,
                is_auto_complete,
                current_user_id,
            )
        elif search_type == "playlists":
            results = playlist_search_query(
                session,
                search_str,
                limit,
                offset,
                False,
                is_auto_complete,
                current_user_id,
            )
        elif search_type == "albums":
            results = playlist_search_query(
                session,
                search_str,
                limit,
                offset,
                True,
                is_auto_complete,
                current_user_id,
            )
        return results


# SEARCH QUERIES
# We chose to use the raw SQL instead of SQLAlchemy because we're pushing SQLAlchemy to it's
# limit to do this query by creating new wrappers for pg functions that do not exist like
# TSQuery and pg_trgm specific functions like similarity.
#
# However, we query for object_id and fetch the actual objects using SQLAlchemy to preserve
# the full objects and helper methods that the ORM provides. This is done in post-processing
# after the initial text query executes.
#
# search query against custom materialized view created in alembic migration
# - returns all object ids which have a trigram match with query string
# - order by descending similarity and paginate
# - de-duplicates object_ids with multiple hits, returning highest match
#
# queries can be called for public data, or personalized data
# - personalized data will return only saved tracks, saved playlists, or followed users given current_user_id
#
# @devnote - track_ids argument should match tracks argument


def search(args):
    """Perform a search. `args` should contain `is_auto_complete`,
    `query`, `kind`, `current_user_id`, and `only_downloadable`
    """

    if os.getenv("audius_elasticsearch_search_enabled"):
        try:
            resp = search_es_full(args)
            return resp
        except Exception as e:
            logger.error(f"Elasticsearch error: {e}")

    search_str = args.get("query")

    # when creating query table, we substitute this too
    search_str = search_str.replace("&", "and")

    kind = args.get("kind", "all")
    is_auto_complete = args.get("is_auto_complete")
    current_user_id = args.get("current_user_id")
    only_downloadable = args.get("only_downloadable")
    limit = args.get("limit")
    offset = args.get("offset")

    searchKind = SearchKind[kind]

    results = {}

    # Accumulate user_ids for later
    user_ids = set()

    # Create args for perform_search_query
    search_args = {
        "search_str": search_str,
        "limit": limit,
        "offset": offset,
        "is_auto_complete": is_auto_complete,
        "current_user_id": current_user_id,
        "only_downloadable": only_downloadable,
    }

    if search_str:
        db = get_db_read_replica()
        # Concurrency approach:
        # Spin up a ThreadPoolExecutor for each request to perform_search_query
        # to perform the different search types in parallel.
        # After each future resolves, we then add users for each entity in a single
        # db round trip.
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            # Keep a mapping of future -> search_type
            futures_map = {}
            futures = []

            # Helper fn to submit a future and add it to bookkeeping data structures
            def submit_and_add(search_type):
                future = executor.submit(
                    perform_search_query, db, search_type, search_args
                )
                futures.append(future)
                futures_map[future] = search_type

            if searchKind in [SearchKind.all, SearchKind.tracks]:
                submit_and_add("tracks")

            if searchKind in [SearchKind.all, SearchKind.users]:
                submit_and_add("users")
            if searchKind in [SearchKind.all, SearchKind.playlists]:
                submit_and_add("playlists")

            if searchKind in [SearchKind.all, SearchKind.albums]:
                submit_and_add("albums")

            for future in concurrent.futures.as_completed(futures):
                search_result = future.result()
                future_type = futures_map[future]

                # Add to the final results
                # Add to user_ids
                if future_type == "tracks":
                    results["tracks"] = search_result["all"]
                    results["saved_tracks"] = search_result["saved"]
                elif future_type == "users":
                    results["users"] = search_result["all"]
                    results["followed_users"] = search_result["followed"]
                elif future_type == "playlists":
                    results["playlists"] = search_result["all"]
                    results["saved_playlists"] = search_result["saved"]
                elif future_type == "albums":
                    results["albums"] = search_result["all"]
                    results["saved_albums"] = search_result["saved"]
                user_ids.update(get_users_ids(search_result["all"]))

            with db.scoped_session() as session:
                # Add users back
                users = get_users_by_id(session, list(user_ids), current_user_id)

                for (_, result_list) in results.items():
                    for result in result_list:
                        user_id = None
                        if "playlist_owner_id" in result:
                            user_id = result["playlist_owner_id"]
                        elif "owner_id" in result:
                            user_id = result["owner_id"]

                        if user_id is not None:
                            user = users[user_id]
                            result["user"] = user
    return extend_search(results)


def track_search_query(
    session,
    search_str,
    limit,
    offset,
    is_auto_complete,
    current_user_id,
    only_downloadable,
):

    res = sqlalchemy.text(
        # pylint: disable=C0301
        f"""
        select track_id, b.balance, b.associated_wallets_balance, u.is_saved from (
            select distinct on (owner_id) track_id, owner_id, is_saved, total_score
            from (
                select track_id, owner_id, is_saved,
                    (
                        (:similarity_weight * sum(score)) +
                        (:title_weight * similarity(coalesce(title, ''), query)) +
                        (:user_name_weight * similarity(coalesce(user_name, ''), query)) +
                        (:repost_weight * log(case when (repost_count = 0) then 1 else repost_count end)) +
                        (case when (lower(query) = coalesce(title, '')) then :title_match_boost else 0 end) +
                        (case when (lower(query) = handle) then :handle_match_boost else 0 end) +
                        (case when (lower(query) = user_name) then :user_name_match_boost else 0 end)
                        {
                            '+ (case when (is_saved) then :current_user_saved_match_boost else 0 end)'
                            if current_user_id
                            else ""
                        }
                    ) as total_score
                from (
                    select
                        d."track_id" as track_id, d."word" as word, similarity(d."word", :query) as score,
                        d."track_title" as title, :query as query, d."user_name" as user_name, d."handle" as handle,
                        d."repost_count" as repost_count, d."owner_id" as owner_id
                        {
                            ',s."user_id" is not null as is_saved'
                            if current_user_id
                            else ", false as is_saved"
                        }
                    from "track_lexeme_dict" d
                    {
                        "left outer join (select save_item_id, user_id from saves where saves.save_type = 'track' " +
                        "and saves.is_current = true " +
                        "and saves.is_delete = false and saves.user_id = :current_user_id )" +
                        " s on s.save_item_id = d.track_id"
                        if current_user_id
                        else ""
                    }
                    {
                        'inner join "tracks" t on t.track_id = d.track_id'
                        if only_downloadable
                        else ""
                    }
                    where (d."word" % lower(:query) or d."handle" = lower(:query) or d."user_name" % lower(:query))
                    {
                        "and (t.download->>'is_downloadable')::boolean is True"
                        if only_downloadable
                        else ""
                    }
                ) as results
                group by track_id, title, query, user_name, handle, repost_count, owner_id, is_saved
            ) as results2
            order by owner_id, total_score desc
        ) as u left join user_balances b on u.owner_id = b.user_id
        order by total_score desc
        limit :limit
        offset :offset;
        """
    )

    track_result_proxy = session.execute(
        res,
        params={
            "query": search_str,
            "limit": limit,
            "offset": offset,
            "title_weight": search_title_weight,
            "repost_weight": search_repost_weight,
            "similarity_weight": search_similarity_weight,
            "current_user_id": current_user_id,
            "user_name_weight": search_user_name_weight,
            "title_match_boost": search_title_exact_match_boost,
            "handle_match_boost": search_handle_exact_match_boost,
            "user_name_match_boost": search_user_name_exact_match_boost,
            "current_user_saved_match_boost": current_user_saved_match_boost,
        },
    )

    track_data = track_result_proxy.fetchall()
    track_cols = track_result_proxy.keys()

    # track_ids is list of tuples - simplify to 1-D list
    track_ids = [track[track_cols.index("track_id")] for track in track_data]
    saved_tracks = {
        track[0] for track in track_data if track[track_cols.index("is_saved")]
    }

    tracks = get_unpopulated_tracks(session, track_ids, True)

    # TODO: Populate track metadata should be sped up to be able to be
    # used in search autocomplete as that'll give us better results.
    if is_auto_complete:
        # fetch users for tracks
        track_owner_ids = list(map(lambda track: track["owner_id"], tracks))
        users = get_unpopulated_users(session, track_owner_ids)
        users_dict = {user["user_id"]: user for user in users}

        # attach user objects to track objects
        for i, track in enumerate(tracks):
            user = users_dict[track["owner_id"]]
            # Add user balance
            balance = track_data[i][1]
            associated_balance = track_data[i][2]
            user[response_name_constants.balance] = balance
            user[
                response_name_constants.associated_wallets_balance
            ] = associated_balance
            track["user"] = user
    else:
        # bundle peripheral info into track results
        tracks = populate_track_metadata(session, track_ids, tracks, current_user_id)

    # Preserve order from track_ids above
    tracks_map = {}
    for t in tracks:
        tracks_map[t["track_id"]] = t
    tracks = [tracks_map[track_id] for track_id in track_ids]

    tracks_response = {
        "all": tracks,
        "saved": list(filter(lambda track: track["track_id"] in saved_tracks, tracks)),
    }

    return tracks_response


def user_search_query(
    session, search_str, limit, offset, is_auto_complete, current_user_id
):

    res = sqlalchemy.text(
        f"""
        select u.user_id, b.balance, b.associated_wallets_balance, is_followed from (
            select user_id, is_followed from (
                select user_id, is_followed, (
                    sum(score) +
                    (:follower_weight * log(case when (follower_count = 0) then 1 else follower_count end)) +
                    (case when (handle=query) then :handle_match_boost else 0 end) +
                    (:name_weight * similarity(coalesce(name, ''), query))
                    {
                        "+ (case when (is_followed) " +
                        "then :current_user_saved_match_boost else 0 end)"
                        if current_user_id
                        else ""
                    }
                    ) as total_score from (
                        select
                                d."user_id" as user_id,
                                d."word" as word,
                                d."handle" as handle,
                                similarity(d."word", :query) as score,
                                d."user_name" as name,
                                :query as query,
                                d."follower_count" as follower_count
                                {
                                    ', f."follower_user_id" is not null as is_followed'
                                    if current_user_id
                                    else ", false as is_followed"
                                }
                        from "user_lexeme_dict" d
                        {
                            "left outer join (select follower_user_id, followee_user_id from follows " +
                            "where follows.is_current = true " +
                            "and follows.is_delete = false " +
                            "and follows.follower_user_id = :current_user_id) f " +
                            "on f.followee_user_id = d.user_id"
                            if current_user_id
                            else ""
                        }
                        where
                            d."word" % :query OR
                            d."handle" = :query
                    ) as results
                group by user_id, name, query, handle, follower_count, is_followed
            ) as results2
            order by total_score desc, user_id asc
            limit :limit
            offset :offset
        ) as u left join user_balances b on u.user_id = b.user_id
        """
    )

    user_result_proxy = session.execute(
        res,
        {
            "query": search_str,
            "limit": limit,
            "offset": offset,
            "name_weight": user_name_weight,
            "follower_weight": user_follower_weight,
            "current_user_id": current_user_id,
            "handle_match_boost": user_handle_exact_match_boost,
            "current_user_saved_match_boost": current_user_saved_match_boost,
        },
    )
    user_info = user_result_proxy.fetchall()
    user_cols = user_result_proxy.keys()

    # user_ids is list of tuples - simplify to 1-D list
    user_ids = [user[user_cols.index("user_id")] for user in user_info]

    # if user has a follower_user_id, the current user has followed that user
    followed_users = {
        user[0] for user in user_info if user[user_cols.index("is_followed")]
    }

    users = get_unpopulated_users(session, user_ids)

    if is_auto_complete:
        for i, user in enumerate(users):
            balance = user_info[i][1]
            associated_wallets_balance = user_info[i][2]
            user[response_name_constants.balance] = balance
            user[
                response_name_constants.associated_wallets_balance
            ] = associated_wallets_balance
    else:
        # bundle peripheral info into user results
        users = populate_user_metadata(session, user_ids, users, current_user_id)

    # Preserve order from user_ids above
    user_map = {}
    for u in users:
        user_map[u["user_id"]] = u
    users = [user_map[user_id] for user_id in user_ids]

    # Sort users by extra criteria for "best match"
    users.sort(key=cmp_to_key(compare_users))

    users_response = {
        "all": users,
        "followed": list(filter(lambda user: user["user_id"] in followed_users, users)),
    }

    return users_response


def playlist_search_query(
    session,
    search_str,
    limit,
    offset,
    is_album,
    is_auto_complete,
    current_user_id,
):

    table_name = "album_lexeme_dict" if is_album else "playlist_lexeme_dict"
    repost_type = RepostType.album if is_album else RepostType.playlist
    save_type = SaveType.album if is_album else SaveType.playlist

    # SQLAlchemy doesn't expose a way to escape a string with double-quotes instead of
    # single-quotes, so we have to use traditional string substitution. This is safe
    # because the value is not user-specified.
    res = sqlalchemy.text(
        # pylint: disable=C0301
        f"""
        select p.playlist_id, b.balance, b.associated_wallets_balance, is_saved from (
            select distinct on (owner_id) playlist_id, owner_id, is_saved, total_score from (
                select playlist_id, owner_id, is_saved, (
                    (:similarity_weight * sum(score)) +
                    (:title_weight * similarity(coalesce(playlist_name, ''), query)) +
                    (:user_name_weight * similarity(coalesce(user_name, ''), query)) +
                    (:repost_weight * log(case when (repost_count = 0) then 1 else repost_count end)) +
                    (case when (lower(query) = coalesce(playlist_name, '')) then :title_match_boost else 0 end) +
                    (case when (lower(query) = handle) then :handle_match_boost else 0 end) +
                    (case when (lower(query) = user_name) then :user_name_match_boost else 0 end)
                    {
                        '+ (case when (is_saved) then ' +
                        ':current_user_saved_match_boost else 0 end)'
                        if current_user_id
                        else ""
                    }
                ) as total_score
                from (
                    select
                        d."playlist_id" as playlist_id, d."word" as word, similarity(d."word", :query) as score,
                        d."playlist_name" as playlist_name, :query as query, d."repost_count" as repost_count,
                        d."handle" as handle, d."user_name" as user_name, d."owner_id" as owner_id
                        {
                            ', s."user_id" is not null as is_saved'
                            if current_user_id
                            else ", false as is_saved"
                        }
                    from "{table_name}" d
                    {
                        "left outer join (select save_item_id, user_id from saves where saves.save_type = '"
                        + save_type + "' and saves.is_current = true and " +
                        "saves.is_delete = false and saves.user_id = :current_user_id ) " +
                        "s on s.save_item_id = d.playlist_id"
                        if current_user_id
                        else ""
                    }
                    where (d."word" % lower(:query) or d."handle" = lower(:query) or d."user_name" % lower(:query))
                ) as results
                group by playlist_id, playlist_name, query, repost_count, user_name, handle, owner_id, is_saved
            ) as results2
            order by owner_id, total_score desc
        ) as p left join user_balances b on p.owner_id = b.user_id
        order by total_score desc
        limit :limit
        offset :offset;
        """
    )

    playlist_result_proxy = session.execute(
        res,
        {
            "query": search_str,
            "limit": limit,
            "offset": offset,
            "title_weight": search_title_weight,
            "repost_weight": search_repost_weight,
            "similarity_weight": search_similarity_weight,
            "current_user_id": current_user_id,
            "user_name_weight": search_user_name_weight,
            "title_match_boost": search_title_exact_match_boost,
            "handle_match_boost": search_handle_exact_match_boost,
            "user_name_match_boost": search_user_name_exact_match_boost,
            "current_user_saved_match_boost": current_user_saved_match_boost,
        },
    )
    playlist_data = playlist_result_proxy.fetchall()
    playlist_cols = playlist_result_proxy.keys()

    # playlist_ids is list of tuples - simplify to 1-D list
    playlist_ids = [
        playlist[playlist_cols.index("playlist_id")] for playlist in playlist_data
    ]
    saved_playlists = {
        playlist[0]
        for playlist in playlist_data
        if playlist[playlist_cols.index("is_saved")]
    }

    playlists = get_unpopulated_playlists(session, playlist_ids, True)

    # TODO: Populate playlist metadata should be sped up to be able to be
    # used in search autocomplete as that'll give us better results.
    if is_auto_complete:
        # fetch users for playlists
        playlist_owner_ids = list(
            map(lambda playlist: playlist["playlist_owner_id"], playlists)
        )
        users = get_unpopulated_users(session, playlist_owner_ids)
        users_dict = {user["user_id"]: user for user in users}

        # attach user objects to playlist objects
        for i, playlist in enumerate(playlists):
            user = users_dict[playlist["playlist_owner_id"]]
            # Add user balance
            balance = playlist_data[i][1]
            associated_balance = playlist_data[i][2]
            user[response_name_constants.balance] = balance
            user[
                response_name_constants.associated_wallets_balance
            ] = associated_balance
            playlist["user"] = user

    else:
        # bundle peripheral info into playlist results
        playlists = populate_playlist_metadata(
            session,
            playlist_ids,
            playlists,
            [repost_type],
            [save_type],
            current_user_id,
        )

    # Preserve order from playlist_ids above
    playlists_map = {}
    for p in playlists:
        playlists_map[p["playlist_id"]] = p
    playlists = [playlists_map[playlist_id] for playlist_id in playlist_ids]

    playlists_resp = {
        "all": playlists,
        "saved": list(
            filter(
                lambda playlist: playlist["playlist_id"] in saved_playlists, playlists
            )
        ),
    }

    return playlists_resp
