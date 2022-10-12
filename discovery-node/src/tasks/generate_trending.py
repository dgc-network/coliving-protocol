import logging  # pylint: disable=C0302
from datetime import datetime, timedelta
from urllib.parse import unquote

from sqlalchemy import desc, func
from src.models.social.aggregate_plays import AggregatePlay
from src.models.social.follow import Follow
from src.models.social.play import Play
from src.models.social.repost import RepostType
from src.models.social.save import SaveType
from src.models.agreements.digital_content import DigitalContent
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
# Returns [{ digital_content_id: number, listens: number }]
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
        return base_query.filter(DigitalContent.genre.in_(genre_list))

    # Construct base query
    if time:
        # If we want to query plays by time, use the plays table directly
        base_query = session.query(
            Play.play_item_id, func.count(Play.id).label("count"), DigitalContent.created_at
        ).join(DigitalContent, DigitalContent.digital_content_id == Play.play_item_id)
    else:
        # Otherwise, it's safe to just query over the aggregate plays table (all time)
        base_query = session.query(
            AggregatePlay.play_item_id.label("id"),
            AggregatePlay.count.label("count"),
            DigitalContent.created_at,
        ).join(DigitalContent, DigitalContent.digital_content_id == AggregatePlay.play_item_id)

    base_query = base_query.filter(
        DigitalContent.is_current == True,
        DigitalContent.is_delete == False,
        DigitalContent.is_unlisted == False,
        DigitalContent.stem_of == None,
    )

    if time:
        base_query = base_query.group_by(Play.play_item_id, DigitalContent.created_at)

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
        {"digital_content_id": listen[0], "listens": listen[1], "created_at": listen[2]}
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

    digital_content_ids = [digital_content[response_name_constants.digital_content_id] for digital_content in listen_counts]

    # Generate digital_content id -> created_at date
    digital_content_created_at_dict = {
        record["digital_content_id"]: record["created_at"] for record in listen_counts
    }

    # Query repost counts
    repost_counts = get_repost_counts(session, False, True, digital_content_ids, None)

    # Generate digital_content_id --> repost_count mapping
    digital_content_repost_counts = {
        repost_item_id: repost_count
        for (repost_item_id, repost_count, repost_type) in repost_counts
        if repost_type == RepostType.digital_content
    }

    # Query repost count with respect to rolling time frame in URL (e.g. /trending/week -> window = rolling week)
    digital_content_repost_counts_for_time = get_repost_counts(
        session, False, True, digital_content_ids, None, None, time
    )

    # Generate digital_content_id --> windowed_repost_count mapping
    digital_content_repost_counts_for_time = {
        repost_item_id: repost_count
        for (repost_item_id, repost_count, repost_type) in digital_content_repost_counts_for_time
        if repost_type == RepostType.digital_content
    }

    # Query follower info for each digital_content owner
    # Query each digital_content owner
    digital_content_owners_query = (
        session.query(DigitalContent.digital_content_id, DigitalContent.owner_id).filter(
            DigitalContent.is_current == True,
            DigitalContent.is_unlisted == False,
            DigitalContent.stem_of == None,
            DigitalContent.digital_content_id.in_(digital_content_ids),
        )
    ).all()

    # Generate digital_content_id <-> owner_id mapping
    digital_content_owner_dict = dict(digital_content_owners_query)
    # Generate list of owner ids
    digital_content_owner_list = [owner_id for (digital_content_id, owner_id) in digital_content_owners_query]

    # build dict of owner_id --> follower_count
    follower_counts = (
        session.query(Follow.followee_user_id, func.count(Follow.followee_user_id))
        .filter(
            Follow.is_current == True,
            Follow.is_delete == False,
            Follow.followee_user_id.in_(digital_content_owner_list),
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
    save_counts = get_save_counts(session, False, True, digital_content_ids, None)
    # Generate digital_content_id --> save_count mapping
    digital_content_save_counts = {
        save_item_id: save_count
        for (save_item_id, save_count, save_type) in save_counts
        if save_type == SaveType.digital_content
    }

    # Query save counts with respect to rolling time frame in URL (e.g. /trending/week -> window = rolling week)
    save_counts_for_time = get_save_counts(
        session, False, True, digital_content_ids, None, None, time
    )
    # Generate digital_content_id --> windowed_save_count mapping
    digital_content_save_counts_for_time = {
        save_item_id: save_count
        for (save_item_id, save_count, save_type) in save_counts_for_time
        if save_type == SaveType.digital_content
    }

    karma_query = get_karma(
        session, tuple(digital_content_ids), strategy, None, False, xf, strategy
    )
    karma_counts_for_id = dict(karma_query)

    trending_digital_contents = []
    for digital_content_entry in listen_counts:
        digital_content_id = digital_content_entry[response_name_constants.digital_content_id]

        # Populate repost counts
        digital_content_entry[response_name_constants.repost_count] = digital_content_repost_counts.get(
            digital_content_id, 0
        )

        # Populate repost counts with respect to time
        digital_content_entry[
            response_name_constants.windowed_repost_count
        ] = digital_content_repost_counts_for_time.get(digital_content_id, 0)

        # Populate save counts
        digital_content_entry[response_name_constants.save_count] = digital_content_save_counts.get(
            digital_content_id, 0
        )

        # Populate save counts with respect to time
        digital_content_entry[
            response_name_constants.windowed_save_count
        ] = digital_content_save_counts_for_time.get(digital_content_id, 0)

        # Populate owner follower count
        owner_id = digital_content_owner_dict[digital_content_id]
        owner_follow_count = follower_count_dict.get(owner_id, 0)
        digital_content_entry[response_name_constants.digital_content_owner_id] = owner_id
        digital_content_entry[response_name_constants.owner_follower_count] = owner_follow_count

        # Populate created at timestamps
        if digital_content_id in digital_content_created_at_dict:
            # datetime needs to be in isoformat for json.dumps() in `update_trending_cache()` to
            # properly process the dp response and add to redis cache
            # timespec = specifies additional components of the time to include
            digital_content_entry[response_name_constants.created_at] = digital_content_created_at_dict[
                digital_content_id
            ].isoformat(timespec="seconds")
        else:
            digital_content_entry[response_name_constants.created_at] = None

        digital_content_entry["karma"] = karma_counts_for_id.get(digital_content_id, 0)

        trending_digital_contents.append(digital_content_entry)

    final_resp = {}
    final_resp["listen_counts"] = trending_digital_contents
    return final_resp
