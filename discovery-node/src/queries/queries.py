import logging  # pylint: disable=C0302

from flask import Blueprint, request
from src import api_helpers, exceptions
from src.queries.get_cid_source import get_cid_source
from src.queries.get_feed import get_feed
from src.queries.get_follow_intersection_users import get_follow_intersection_users
from src.queries.get_followees_for_user import get_followees_for_user
from src.queries.get_followers_for_user import get_followers_for_user
from src.queries.get_max_id import get_max_id
from src.queries.get_content_list_repost_intersection_users import (
    get_content_list_repost_intersection_users,
)
from src.queries.get_content_lists import get_content_lists
from src.queries.get_previously_private_content_lists import (
    get_previously_private_content_lists,
)
from src.queries.get_previously_unlisted_digital_contents import get_previously_unlisted_digital_contents
from src.queries.get_remix_digital_content_parents import get_remix_digital_content_parents
from src.queries.get_remixes_of import get_remixes_of
from src.queries.get_repost_feed_for_user import get_repost_feed_for_user
from src.queries.get_reposters_for_content_list import get_reposters_for_content_list
from src.queries.get_reposters_for_digital_content import get_reposters_for_digital_content
from src.queries.get_savers_for_content_list import get_savers_for_content_list
from src.queries.get_savers_for_digital_content import get_savers_for_digital_content
from src.queries.get_saves import get_saves
from src.queries.get_sol_plays import (
    get_sol_play,
    get_total_aggregate_plays,
    get_digital_content_listen_milestones,
)
from src.queries.get_stems_of import get_stems_of
from src.queries.get_top_followee_saves import get_top_followee_saves
from src.queries.get_top_followee_windowed import get_top_followee_windowed
from src.queries.get_top_genre_users import get_top_genre_users
from src.queries.get_top_content_lists import get_top_content_lists
from src.queries.get_digital_content_repost_intersection_users import (
    get_digital_content_repost_intersection_users,
)
from src.queries.get_digital_contents import get_digital_contents
from src.queries.get_digital_contents_including_unlisted import get_digital_contents_including_unlisted
from src.queries.get_ursm_cnodes import get_ursm_cnodes
from src.queries.get_user_history import get_user_history
from src.queries.get_users import get_users
from src.queries.get_users_account import get_users_account
from src.queries.query_helpers import get_current_user_id, get_pagination_vars
from src.utils.redis_metrics import record_metrics

logger = logging.getLogger(__name__)
bp = Blueprint("queries", __name__)


def to_dict(multi_dict):
    """Converts a multi dict into a dict where only list entries are not flat"""
    return {
        k: v if len(v) > 1 else v[0]
        for (k, v) in multi_dict.to_dict(flat=False).items()
    }


def parse_bool_param(field):
    """Converts a url param to a boolean value"""
    return field.lower() == "true" if field else False


def parse_id_array_param(list):
    """Converts a list of strings ids to int"""
    return [int(y) for y in list]


# ####### ROUTES ####### #

# Returns all users (paginated) with each user's follow count
# Optionally filters by wallet or user ids
@bp.route("/users", methods=("GET",))
@record_metrics
def get_users_route():
    args = to_dict(request.args)
    if "id" in request.args:
        args["id"] = parse_id_array_param(request.args.getlist("id"))
    if "min_block_number" in request.args:
        args["min_block_number"] = request.args.get("min_block_number", type=int)
    current_user_id = get_current_user_id(required=False)
    args["current_user_id"] = current_user_id
    users = get_users(args)
    return api_helpers.success_response(users)


# Returns all digitalContents (paginated) with each digital_content's repost count
# optionally filters by digital_content ids
@bp.route("/digitalContents", methods=("GET",))
@record_metrics
def get_digital_contents_route():
    args = to_dict(request.args)
    if "id" in request.args:
        args["id"] = parse_id_array_param(request.args.getlist("id"))
    if "user_id" in request.args:
        args["user_id"] = request.args.get("user_id", type=int)
    if "filter_deleted" in request.args:
        args["filter_deleted"] = parse_bool_param(request.args.get("filter_deleted"))
    if "with_users" in request.args:
        args["with_users"] = parse_bool_param(request.args.get("with_users"))
    if "min_block_number" in request.args:
        args["min_block_number"] = request.args.get("min_block_number", type=int)
    current_user_id = get_current_user_id(required=False)
    args["current_user_id"] = current_user_id
    digitalContents = get_digital_contents(args)
    return api_helpers.success_response(digitalContents)


# Get all digitalContents matching a route_id and digital_content_id.
# Expects a JSON body of shape:
#   { "digitalContents": [{ "id": number, "url_title": string, "handle": string }]}
@bp.route("/digitalContents_including_unlisted", methods=("POST",))
@record_metrics
def get_digital_contents_including_unlisted_route():
    args = to_dict(request.args)
    if "filter_deleted" in request.args:
        args["filter_deleted"] = parse_bool_param(request.args.get("filter_deleted"))
    if "with_users" in request.args:
        args["with_users"] = parse_bool_param(request.args.get("with_users"))
    current_user_id = get_current_user_id(required=False)
    args["current_user_id"] = current_user_id
    identifiers = request.get_json()["digitalContents"]
    args["identifiers"] = identifiers
    digitalContents = get_digital_contents_including_unlisted(args)
    return api_helpers.success_response(digitalContents)


@bp.route("/stems/<int:digital_content_id>", methods=("GET",))
@record_metrics
def get_stems_of_route(digital_content_id):
    stems = get_stems_of(digital_content_id)
    return api_helpers.success_response(stems)


# Return contentList content in json form
# optional parameters contentList owner's user_id, content_list_id = []
@bp.route("/contentLists", methods=("GET",))
@record_metrics
def get_content_lists_route():
    args = to_dict(request.args)
    if "content_list_id" in request.args:
        args["content_list_id"] = [int(y) for y in request.args.getlist("content_list_id")]
    if "user_id" in request.args:
        args["user_id"] = request.args.get("user_id", type=int)
    if "with_users" in request.args:
        args["with_users"] = parse_bool_param(request.args.get("with_users"))
    current_user_id = get_current_user_id(required=False)
    args["current_user_id"] = current_user_id
    contentLists = get_content_lists(args)
    return api_helpers.success_response(contentLists)


# Discovery Node Social Feed Overview
# For a given user, current_user, we provide a feed of relevant content from around the coliving network.
# This is generated in the following manner:
#   - Generate list of users followed by current_user, known as 'followees'
#   - Query all digital_content and public contentList reposts from followees
#     - Generate list of reposted digital_content ids and reposted contentList ids
#   - Query all digital_content and public contentLists reposted OR created by followees, ordered by timestamp
#     - At this point, 2 separate arrays one for contentLists / one for digitalContents
#   - Query additional metadata around feed entries in each array, repost + save counts, user repost boolean
#   - Combine unsorted contentList and digital_content arrays
#   - Sort combined results by 'timestamp' field and return
@bp.route("/feed", methods=("GET",))
@record_metrics
def get_feed_route():
    args = to_dict(request.args)
    # filter should be one of ["all", "reposts", "original"]
    # empty filter value results in "all"
    if "filter" in request.args and request.args.get("filter") in [
        "all",
        "repost",
        "original",
    ]:
        args["filter"] = args.get("filter")
    else:
        args["filter"] = "all"
    if "digitalContents_only" in request.args:
        args["digitalContents_only"] = parse_bool_param(request.args.get("digitalContents_only"))
    if "with_users" in request.args:
        args["with_users"] = parse_bool_param(request.args.get("with_users"))
    if "followee_user_id" in request.args:
        args["followee_user_ids"] = parse_id_array_param(
            request.args.getlist("followee_user_id")
        )
    user_id = get_current_user_id()
    args["user_id"] = user_id
    feed_results = get_feed(args)
    return api_helpers.success_response(feed_results)


# user repost feed steps
# - get all reposts by user
# - get all digital_content and public contentList reposts by user, ordered by timestamp
# - get additional metadata for each digital_content/contentList: save count, repost count, current_user_reposted, followee_reposts
# -   (if current_user == user, skip current_user_reposted check and set all to true)
# - combine unsorted contentList and digital_content arrays
# - sort combined results by activity_timestamp field and return
@bp.route("/feed/reposts/<int:user_id>", methods=("GET",))
@record_metrics
def get_repost_feed_for_user_route(user_id):
    args = to_dict(request.args)
    if "with_users" in request.args:
        args["with_users"] = parse_bool_param(request.args.get("with_users"))
    args["current_user_id"] = get_current_user_id(required=False)
    feed_results = get_repost_feed_for_user(user_id, args)
    return api_helpers.success_response(feed_results)


# intersection of user1's followers and user2's followees
# get intersection of users that follow followeeUserId and users that are followed by followerUserId
# followee = user that is followed; follower = user that follows
@bp.route(
    "/users/intersection/follow/<int:followee_user_id>/<int:follower_user_id>",
    methods=("GET",),
)
@record_metrics
def get_follow_intersection_users_route(followee_user_id, follower_user_id):
    users = get_follow_intersection_users(followee_user_id, follower_user_id)
    return api_helpers.success_response(users)


# get intersection of users that have reposted provided repost_digital_content_id and users that are
# followed by follower_user_id.
# - Followee = user that is followed. Follower = user that follows.
# - repost_digital_content_id = digital_content that is reposted. repost_user_id = user that reposted digital_content.
@bp.route(
    "/users/intersection/repost/digital_content/<int:repost_digital_content_id>/<int:follower_user_id>",
    methods=("GET",),
)
@record_metrics
def get_digital_content_repost_intersection_users_route(repost_digital_content_id, follower_user_id):
    try:
        users = get_digital_content_repost_intersection_users(repost_digital_content_id, follower_user_id)
        return api_helpers.success_response(users)
    except exceptions.NotFoundError as e:
        return api_helpers.error_response(str(e), 404)


# Get intersection of users that have reposted provided repost_content_list_id and users that
# are followed by provided follower_user_id.
# - Followee = user that is followed. Follower = user that follows.
# - repost_content_list_id = contentList that is reposted. repost_user_id = user that reposted contentList.
@bp.route(
    "/users/intersection/repost/contentList/<int:repost_content_list_id>/<int:follower_user_id>",
    methods=("GET",),
)
@record_metrics
def get_content_list_repost_intersection_users_route(repost_content_list_id, follower_user_id):
    try:
        users = get_content_list_repost_intersection_users(
            repost_content_list_id, follower_user_id
        )
        return api_helpers.success_response(users)
    except exceptions.NotFoundError as e:
        return api_helpers.error_response(str(e), 404)


# Get paginated users that follow provided followee_user_id, sorted by their follower count descending.
@bp.route("/users/followers/<int:followee_user_id>", methods=("GET",))
@record_metrics
def get_followers_for_user_route(followee_user_id):
    current_user_id = get_current_user_id(required=False)
    (limit, offset) = get_pagination_vars()
    args = {
        "followee_user_id": followee_user_id,
        "current_user_id": current_user_id,
        "limit": limit,
        "offset": offset,
    }
    users = get_followers_for_user(args)
    return api_helpers.success_response(users)


# Get paginated users that are followed by provided follower_user_id, sorted by their follower count descending.
@bp.route("/users/followees/<int:follower_user_id>", methods=("GET",))
@record_metrics
def get_followees_for_user_route(follower_user_id):
    current_user_id = get_current_user_id(required=False)
    (limit, offset) = get_pagination_vars()
    args = {
        "follower_user_id": follower_user_id,
        "current_user_id": current_user_id,
        "limit": limit,
        "offset": offset,
    }
    users = get_followees_for_user(args)
    return api_helpers.success_response(users)


# Get paginated users that reposted provided repost_digital_content_id, sorted by their follower count descending.
@bp.route("/users/reposts/digital_content/<int:repost_digital_content_id>", methods=("GET",))
@record_metrics
def get_reposters_for_digital_content_route(repost_digital_content_id):
    try:
        current_user_id = get_current_user_id(required=False)
        (limit, offset) = get_pagination_vars()
        args = {
            "repost_digital_content_id": repost_digital_content_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        user_results = get_reposters_for_digital_content(args)
        return api_helpers.success_response(user_results)
    except exceptions.NotFoundError as e:
        return api_helpers.error_response(str(e), 404)


# Get paginated users that reposted provided repost_content_list_id, sorted by their follower count descending.
@bp.route("/users/reposts/contentList/<int:repost_content_list_id>", methods=("GET",))
@record_metrics
def get_reposters_for_content_list_route(repost_content_list_id):
    try:
        current_user_id = get_current_user_id(required=False)
        (limit, offset) = get_pagination_vars()
        args = {
            "repost_content_list_id": repost_content_list_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        user_results = get_reposters_for_content_list(args)
        return api_helpers.success_response(user_results)
    except exceptions.NotFoundError as e:
        return api_helpers.error_response(str(e), 404)


# Get paginated users that saved provided save_digital_content_id, sorted by their follower count descending.
@bp.route("/users/saves/digital_content/<int:save_digital_content_id>", methods=("GET",))
@record_metrics
def get_savers_for_digital_content_route(save_digital_content_id):
    try:
        current_user_id = get_current_user_id(required=False)
        (limit, offset) = get_pagination_vars()
        args = {
            "save_digital_content_id": save_digital_content_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        user_results = get_savers_for_digital_content(args)
        return api_helpers.success_response(user_results)
    except exceptions.NotFoundError as e:
        return api_helpers.error_response(str(e), 404)


# Get paginated users that saved provided save_content_list_id, sorted by their follower count descending.
@bp.route("/users/saves/contentList/<int:save_content_list_id>", methods=("GET",))
@record_metrics
def get_savers_for_content_list_route(save_content_list_id):
    try:
        current_user_id = get_current_user_id(required=False)
        (limit, offset) = get_pagination_vars()
        args = {
            "save_content_list_id": save_content_list_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        user_results = get_savers_for_content_list(args)
        return api_helpers.success_response(user_results)
    except exceptions.NotFoundError as e:
        return api_helpers.error_response(str(e), 404)


# Get paginated saves of provided save_type for current user.
@bp.route("/saves/<save_type>", methods=("GET",))
@record_metrics
def get_saves_route(save_type):
    try:
        user_id = get_current_user_id()
        save_results = get_saves(save_type, user_id)
        return api_helpers.success_response(save_results)
    except exceptions.ArgumentError as e:
        return api_helpers.error_response(str(e), 400)


# Get the user saved collections & uploaded collections along with the collection user owners
# NOTE: This is a one off endpoint for retrieving a user's collections/associated user and should
# be consolidated later in the client
@bp.route("/users/account", methods=("GET",))
@record_metrics
def get_users_account_route():
    try:
        user = get_users_account(to_dict(request.args))
        return api_helpers.success_response(user)
    except exceptions.ArgumentError as e:
        return api_helpers.error_response(str(e), 400)


# Gets the max id for digitalContents, contentLists, or users.
@bp.route("/latest/<type>", methods=("GET",))
@record_metrics
def get_max_id_route(type):
    try:
        latest = get_max_id(type)
        return api_helpers.success_response(latest)
    except exceptions.ArgumentError as e:
        return api_helpers.error_response(str(e), 400)


@bp.route("/top/<type>", methods=("GET",))
@record_metrics
def get_top_content_lists_route(type):
    """
    An endpoint to retrieve the "top" of a certain demographic of contentLists or albums.
    This endpoint is useful in generating views like:
        - Top contentLists
        - Top Albums
        - Top contentLists of a certain mood
        - Top contentLists of a certain mood from people you follow

    Args:
        type: (string) The `type` (same as repost/save type) to query from.
        limit?: (number) default=16, max=100
        mood?: (string) default=None
        filter?: (string) Optional filter to include (supports 'followees') default=None
    """
    args = to_dict(request.args)
    if "limit" in request.args:
        args["limit"] = min(request.args.get("limit", type=int), 100)
    else:
        args["limit"] = 16

    if "mood" in request.args:
        args["mood"] = request.args.get("mood")
    else:
        args["mood"] = None
    if "with_users" in request.args:
        args["with_users"] = parse_bool_param(request.args.get("with_users"))
    try:
        contentLists = get_top_content_lists(type, args)
        return api_helpers.success_response(contentLists)
    except exceptions.ArgumentError as e:
        return api_helpers.error_response(str(e), 400)


@bp.route("/top_followee_windowed/<type>/<window>")
@record_metrics
def get_top_followee_windowed_route(type, window):
    """
    Gets a windowed (over a certain timerange) view into the "top" of a certain type
    amongst followees. Requires an account.
    This endpoint is useful in generating views like:
        - New releases

    Args:
        type: (string) The `type` (same as repost/save type) to query from. Currently only
            digital_content is supported.
        window: (string) The window from now() to look back over. Supports all standard
            SqlAlchemy interval notation (week, month, year, etc.).
        limit?: (number) default=25, max=100
    """
    args = to_dict(request.args)
    if "limit" in request.args:
        args["limit"] = min(request.args.get("limit", type=int), 100)
    else:
        args["limit"] = 25
    if "with_users" in request.args:
        args["with_users"] = parse_bool_param(request.args.get("with_users"))
    user_id = get_current_user_id()
    args["user_id"] = user_id
    try:
        digitalContents = get_top_followee_windowed(type, window, args)
        return api_helpers.success_response(digitalContents)
    except exceptions.ArgumentError as e:
        return api_helpers.error_response(str(e), 400)


@bp.route("/top_followee_saves/<type>")
@record_metrics
def get_top_followee_saves_route(type):
    """
    Gets a global view into the most saved of `type` amongst followees. Requires an account.
    This endpoint is useful in generating views like:
        - Most favorited

    Args:
        type: (string) The `type` (same as repost/save type) to query from. Currently only
            digital_content is supported.
        limit?: (number) default=25, max=100
    """
    args = to_dict(request.args)
    if "limit" in request.args:
        args["limit"] = min(request.args.get("limit", type=int), 100)
    else:
        args["limit"] = 25
    if "with_users" in request.args:
        args["with_users"] = parse_bool_param(request.args.get("with_users"))
    user_id = get_current_user_id()
    args["user_id"] = user_id
    try:
        digitalContents = get_top_followee_saves(type, args)
        return api_helpers.success_response(digitalContents)
    except exceptions.ArgumentError as e:
        return api_helpers.error_response(str(e), 400)


# Retrieves the top users for a requested genre under the follow parameters
# - A given user can only be associated w/ one genre
# - The user's associated genre is calculated by tallying the genre of the digitalContents and taking the max
#   - If there is a tie for # of digitalContents in a genre, then the first genre alphabetically is taken
# - The users associated w/ the requested genre are then sorted by follower count
# Route Parameters
#   urlParam: {Array<string>?}  genre       List of genres to query for the 'top' users
#   urlParam: {boolean?}        with_user
#             Boolean if the response should be the user ID or user metadata defaults to false
@bp.route("/users/genre/top", methods=("GET",))
@record_metrics
def get_top_genre_users_route():
    args = to_dict(request.args)
    if "with_users" in request.args:
        args["with_users"] = parse_bool_param(request.args.get("with_users"))
    users = get_top_genre_users(args)
    return api_helpers.success_response(users)


# Get the digitalContents that are 'children' remixes of the requested digital_content
# The results are sorted by if the original author has reposted or saved the digital_content
@bp.route("/remixes/<int:digital_content_id>/children", methods=("GET",))
@record_metrics
def get_remixes_of_route(digital_content_id):
    args = to_dict(request.args)
    args["digital_content_id"] = digital_content_id
    args["current_user_id"] = get_current_user_id(required=False)
    limit, offset = get_pagination_vars()
    args["limit"] = limit
    args["offset"] = offset
    if "with_users" in request.args:
        args["with_users"] = parse_bool_param(request.args.get("with_users"))
    try:
        remixes = get_remixes_of(args)
        return api_helpers.success_response(remixes)
    except exceptions.ArgumentError as e:
        return api_helpers.error_response(str(e), 400)


# Get the digitalContents that are 'parent' remixes of the requested digital_content
@bp.route("/remixes/<int:digital_content_id>/parents", methods=("GET",))
@record_metrics
def get_remix_digital_content_parents_route(digital_content_id):
    args = to_dict(request.args)
    if "with_users" in request.args:
        args["with_users"] = parse_bool_param(request.args.get("with_users"))
    args["digital_content_id"] = digital_content_id
    args["current_user_id"] = get_current_user_id(required=False)
    limit, offset = get_pagination_vars()
    args["limit"] = limit
    args["offset"] = offset
    digitalContents = get_remix_digital_content_parents(args)
    return api_helpers.success_response(digitalContents)


# Get the digitalContents that were previously unlisted and became public after the date provided
@bp.route("/previously_unlisted/digital_content", methods=("GET",))
@record_metrics
def get_previously_unlisted_digital_contents_route():
    try:
        digitalContents = get_previously_unlisted_digital_contents(to_dict(request.args))
        return api_helpers.success_response(digitalContents)
    except exceptions.ArgumentError as e:
        return api_helpers.error_response(str(e), 400)


# Get the contentLists that were previously private and became public after the date provided
@bp.route("/previously_private/contentList", methods=("GET",))
@record_metrics
def get_previously_private_content_lists_route():
    try:
        contentLists = get_previously_private_content_lists(to_dict(request.args))
        return api_helpers.success_response(contentLists)
    except exceptions.ArgumentError as e:
        return api_helpers.error_response(str(e), 400)


# Get the list of content nodes registered on UserReplicaSetManager
@bp.route("/ursm_content_nodes", methods=("GET",))
def get_ursm_content_nodes():
    try:
        # Assign value only if not None or empty string
        owner_wallet = request.args.get("owner_wallet") or None
        cnodes = get_ursm_cnodes(owner_wallet)
        return api_helpers.success_response(cnodes)
    except exceptions.ArgumentError as e:
        return api_helpers.error_response(str(e), 400)


# Get details for a single play written to Solana
@bp.route("/get_sol_play", methods=("GET",))
def get_sol_play_tx():
    try:
        # Assign value only if not None or empty string
        tx_sig = request.args.get("tx_sig") or None
        sig = get_sol_play(tx_sig)
        return api_helpers.success_response(sig)
    except exceptions.ArgumentError as e:
        return api_helpers.error_response(str(e), 400)


# Get total aggregate play count
@bp.route("/get_total_aggregate_plays", methods=("GET",))
def get_total_plays():
    try:
        data = get_total_aggregate_plays()
        return api_helpers.success_response(data)
    except exceptions.ArgumentError as e:
        return api_helpers.error_response(str(e), 400)


# Get details for latest digital_content listen milestones
# Used to parse and issue notifications
@bp.route("/digital_content_listen_milestones", methods=("GET",))
def get_digital_content_listen_milestone_data():
    try:
        # Assign value only if not None or empty string
        data = get_digital_content_listen_milestones(100)
        return api_helpers.success_response(data)
    except exceptions.ArgumentError as e:
        return api_helpers.error_response(str(e), 400)


@bp.route("/cid/source/<string:request_cid>", methods=("GET",))
def get_cid_source_route(request_cid):
    try:
        cid_source = get_cid_source(request_cid)
        return api_helpers.success_response(cid_source)
    except exceptions.ArgumentError as e:
        return api_helpers.error_response(str(e), 400)


@bp.route("/users/history/<int:user_id>", methods=("GET",))
def get_user_history_route(user_id):
    try:
        (limit, offset) = get_pagination_vars()
        args = {
            "user_id": user_id,
            "limit": limit,
            "offset": offset,
        }
        user_history = get_user_history(args)
        return api_helpers.success_response(user_history)
    except exceptions.ArgumentError as e:
        return api_helpers.error_response(str(e), 400)
