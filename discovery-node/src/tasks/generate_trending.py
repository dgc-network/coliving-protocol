import logging  # pylint: disable=C0302
from datetime import datetime, timedelta
from urllib.parse import unquote

from sqlalchemy import desc, func
from src.models.social.aggregate_plays import AggregatePlay
from src.models.social.follow import Follow
from src.models.social.play import Play
from src.models.social.repost import RepostType
from src.models.social.save import SaveType
from src.models.agreements.agreement import Agreement
from src.queries import response_name_constants
from src.queries.query_helpers import (
    get_genre_list,
    get_karma,
    get_repost_counts,
    get_save_counts,
)

logger = logging.getLogger(__name__)

trending_cache_hits_key = "trending_cache_hits"
trending_cache_miss_key = "trending_cache_miss"
trending_cache_total_key = "trending_cache_total"


time_delta_map = {
    "year": timedelta(weeks=52),
    "month": timedelta(days=30),
    "week": timedelta(weeks=1),
    "day": timedelta(days=1),
}


# Returns listens counts for agreements, subject to time and
# genre restrictions.
# Returns [{ agreement_id: number, listens: number }]
def get_listen_counts(session, time, genre, limit, offset, net_multiplier=1):

    # Adds a created_at filter
    # on the base query, if applicable.
    #
    # If no `time` param, that means
    # no filter so we return base_query
    # to get all time plays.
    def with_time_filter(base_query, time):
        delta = None
        if not time:
            return base_query
        delta = time_delta_map.get(time)
        if not delta:
            logger.warning(f"Invalid time passed to get_listen_counts: {time}")
            return base_query
        return base_query.filter(Play.created_at > datetime.now() - delta)

    # Adds a genre filter
    # on the base query, if applicable.
    def with_genre_filter(base_query, genre):
        if not genre:
            return base_query

        # Parse encoded characters, such as Hip-Hop%252FRap -> Hip-Hop/Rap
        genre = unquote(genre)

        # Use a list of genres rather than a single genre
        # string to account for umbrella genres
        # like 'Electronic
        genre_list = get_genre_list(genre)
        return base_query.filter(Agreement.genre.in_(genre_list))

    # Construct base query
    if time:
        # If we want to query plays by time, use the plays table directly
        base_query = session.query(
            Play.play_item_id, func.count(Play.id).label("count"), Agreement.created_at
        ).join(Agreement, Agreement.agreement_id == Play.play_item_id)
    else:
        # Otherwise, it's safe to just query over the aggregate plays table (all time)
        base_query = session.query(
            AggregatePlay.play_item_id.label("id"),
            AggregatePlay.count.label("count"),
            Agreement.created_at,
        ).join(Agreement, Agreement.agreement_id == AggregatePlay.play_item_id)

    base_query = base_query.filter(
        Agreement.is_current == True,
        Agreement.is_delete == False,
        Agreement.is_unlisted == False,
        Agreement.stem_of == None,
    )

    if time:
        base_query = base_query.group_by(Play.play_item_id, Agreement.created_at)

    # Add filters to query
    base_query = with_time_filter(base_query, time)
    base_query = with_genre_filter(base_query, genre)

    # Add limit + offset + sort
    base_query = (
        base_query.order_by(desc("count")).limit(limit * net_multiplier).offset(offset)
    )

    listens = base_query.all()

    # Format the results
    listens = [
        {"agreement_id": listen[0], "listens": listen[1], "created_at": listen[2]}
        for listen in listens
    ]
    return listens


def generate_trending(session, time, genre, limit, offset, strategy):
    score_params = strategy.get_score_params()
    xf = score_params["xf"]
    pt = score_params["pt"]
    nm = score_params["nm"] if "nm" in score_params else 1

    # Get listen counts
    listen_counts = get_listen_counts(session, time, genre, limit, offset, nm)

    agreement_ids = [agreement[response_name_constants.agreement_id] for agreement in listen_counts]

    # Generate agreement id -> created_at date
    agreement_created_at_dict = {
        record["agreement_id"]: record["created_at"] for record in listen_counts
    }

    # Query repost counts
    repost_counts = get_repost_counts(session, False, True, agreement_ids, None)

    # Generate agreement_id --> repost_count mapping
    agreement_repost_counts = {
        repost_item_id: repost_count
        for (repost_item_id, repost_count, repost_type) in repost_counts
        if repost_type == RepostType.agreement
    }

    # Query repost count with respect to rolling time frame in URL (e.g. /trending/week -> window = rolling week)
    agreement_repost_counts_for_time = get_repost_counts(
        session, False, True, agreement_ids, None, None, time
    )

    # Generate agreement_id --> windowed_repost_count mapping
    agreement_repost_counts_for_time = {
        repost_item_id: repost_count
        for (repost_item_id, repost_count, repost_type) in agreement_repost_counts_for_time
        if repost_type == RepostType.agreement
    }

    # Query follower info for each agreement owner
    # Query each agreement owner
    agreement_owners_query = (
        session.query(Agreement.agreement_id, Agreement.owner_id).filter(
            Agreement.is_current == True,
            Agreement.is_unlisted == False,
            Agreement.stem_of == None,
            Agreement.agreement_id.in_(agreement_ids),
        )
    ).all()

    # Generate agreement_id <-> owner_id mapping
    agreement_owner_dict = dict(agreement_owners_query)
    # Generate list of owner ids
    agreement_owner_list = [owner_id for (agreement_id, owner_id) in agreement_owners_query]

    # build dict of owner_id --> follower_count
    follower_counts = (
        session.query(Follow.followee_user_id, func.count(Follow.followee_user_id))
        .filter(
            Follow.is_current == True,
            Follow.is_delete == False,
            Follow.followee_user_id.in_(agreement_owner_list),
        )
        .group_by(Follow.followee_user_id)
        .all()
    )
    follower_count_dict = {
        user_id: follower_count
        for (user_id, follower_count) in follower_counts
        if follower_count > pt
    }

    # Query save counts
    save_counts = get_save_counts(session, False, True, agreement_ids, None)
    # Generate agreement_id --> save_count mapping
    agreement_save_counts = {
        save_item_id: save_count
        for (save_item_id, save_count, save_type) in save_counts
        if save_type == SaveType.agreement
    }

    # Query save counts with respect to rolling time frame in URL (e.g. /trending/week -> window = rolling week)
    save_counts_for_time = get_save_counts(
        session, False, True, agreement_ids, None, None, time
    )
    # Generate agreement_id --> windowed_save_count mapping
    agreement_save_counts_for_time = {
        save_item_id: save_count
        for (save_item_id, save_count, save_type) in save_counts_for_time
        if save_type == SaveType.agreement
    }

    karma_query = get_karma(
        session, tuple(agreement_ids), strategy, None, False, xf, strategy
    )
    karma_counts_for_id = dict(karma_query)

    trending_agreements = []
    for agreement_entry in listen_counts:
        agreement_id = agreement_entry[response_name_constants.agreement_id]

        # Populate repost counts
        agreement_entry[response_name_constants.repost_count] = agreement_repost_counts.get(
            agreement_id, 0
        )

        # Populate repost counts with respect to time
        agreement_entry[
            response_name_constants.windowed_repost_count
        ] = agreement_repost_counts_for_time.get(agreement_id, 0)

        # Populate save counts
        agreement_entry[response_name_constants.save_count] = agreement_save_counts.get(
            agreement_id, 0
        )

        # Populate save counts with respect to time
        agreement_entry[
            response_name_constants.windowed_save_count
        ] = agreement_save_counts_for_time.get(agreement_id, 0)

        # Populate owner follower count
        owner_id = agreement_owner_dict[agreement_id]
        owner_follow_count = follower_count_dict.get(owner_id, 0)
        agreement_entry[response_name_constants.agreement_owner_id] = owner_id
        agreement_entry[response_name_constants.owner_follower_count] = owner_follow_count

        # Populate created at timestamps
        if agreement_id in agreement_created_at_dict:
            # datetime needs to be in isoformat for json.dumps() in `update_trending_cache()` to
            # properly process the dp response and add to redis cache
            # timespec = specifies additional components of the time to include
            agreement_entry[response_name_constants.created_at] = agreement_created_at_dict[
                agreement_id
            ].isoformat(timespec="seconds")
        else:
            agreement_entry[response_name_constants.created_at] = None

        agreement_entry["karma"] = karma_counts_for_id.get(agreement_id, 0)

        trending_agreements.append(agreement_entry)

    final_resp = {}
    final_resp["listen_counts"] = trending_agreements
    return final_resp
