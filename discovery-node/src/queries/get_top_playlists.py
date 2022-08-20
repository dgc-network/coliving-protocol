import enum
from typing import Optional, TypedDict

from sqlalchemy import desc
from src import exceptions
from src.models.contentLists.aggregate_contentList import AggregateContentList
from src.models.contentLists.contentList import ContentList
from src.models.social.repost import RepostType
from src.models.social.save import SaveType
from src.queries.query_helpers import (
    create_followee_contentLists_subquery,
    decayed_score,
    filter_to_contentList_mood,
    get_current_user_id,
    get_users_by_id,
    get_users_ids,
    populate_contentList_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


class GetTopContentListsArgs(TypedDict):
    limit: Optional[int]
    mood: Optional[str]
    filter: Optional[str]
    with_users: Optional[bool]


class TopContentListKind(str, enum.Enum):
    contentList = "contentList"
    album = "album"


def get_top_contentLists(kind: TopContentListKind, args: GetTopContentListsArgs):
    current_user_id = get_current_user_id(required=False)

    # Argument parsing and checking
    if kind not in ("contentList", "album"):
        raise exceptions.ArgumentError(
            "Invalid kind provided, must be one of 'contentList', 'album'"
        )

    limit = args.get("limit", 16)
    mood = args.get("mood", None)

    if "filter" in args:
        query_filter = args.get("filter")
        if query_filter != "followees":
            raise exceptions.ArgumentError(
                "Invalid filter provided, must be one of 'followees'"
            )
        if query_filter == "followees":
            if not current_user_id:
                raise exceptions.ArgumentError(
                    "User id required to query for followees"
                )
    else:
        query_filter = None

    db = get_db_read_replica()
    with db.scoped_session() as session:

        # If filtering by followees, set the contentList view to be only contentLists from
        # users that the current user follows.
        if query_filter == "followees":
            contentLists_to_query = create_followee_contentLists_subquery(
                session, current_user_id
            )
        # Otherwise, just query all contentLists
        else:
            contentLists_to_query = session.query(ContentList).subquery()

        # Create a decayed-score view of the contentLists
        contentList_query = (
            session.query(
                contentLists_to_query,
                (AggregateContentList.repost_count + AggregateContentList.save_count).label(
                    "count"
                ),
                decayed_score(
                    AggregateContentList.repost_count + AggregateContentList.save_count,
                    contentLists_to_query.c.created_at,
                ).label("score"),
            )
            .select_from(contentLists_to_query)
            .join(
                AggregateContentList,
                AggregateContentList.contentList_id == contentLists_to_query.c.contentList_id,
            )
            .filter(
                contentLists_to_query.c.is_current == True,
                contentLists_to_query.c.is_delete == False,
                contentLists_to_query.c.is_private == False,
                contentLists_to_query.c.is_album == (kind == "album"),
            )
        )

        # Filter by mood (no-op if no mood is provided)
        contentList_query = filter_to_contentList_mood(
            session, mood, contentList_query, contentLists_to_query
        )

        # Order and limit the contentList query by score
        contentList_query = contentList_query.order_by(
            desc("score"), desc(contentLists_to_query.c.contentList_id)
        ).limit(limit)

        contentList_results = contentList_query.all()

        # Unzip query results into contentLists and scores
        score_map = {}  # contentList_id : score
        contentLists = []
        if contentList_results:
            for result in contentList_results:
                # The contentList is the portion of the query result before repost_count and score
                contentList = result[0:-2]
                score = result[-1]

                # Convert the contentList row tuple into a dictionary keyed by column name
                contentList = helpers.tuple_to_model_dictionary(contentList, ContentList)
                score_map[contentList["contentList_id"]] = score
                contentLists.append(contentList)

        contentList_ids = list(map(lambda contentList: contentList["contentList_id"], contentLists))

        # Bundle peripheral info into contentList results
        contentLists = populate_contentList_metadata(
            session,
            contentList_ids,
            contentLists,
            [RepostType.contentList, RepostType.album],
            [SaveType.contentList, SaveType.album],
            current_user_id,
        )
        # Add scores into the response
        for contentList in contentLists:
            contentList["score"] = score_map[contentList["contentList_id"]]

        if args.get("with_users", False):
            user_id_list = get_users_ids(contentLists)
            users = get_users_by_id(session, user_id_list)
            for contentList in contentLists:
                user = users[contentList["contentList_owner_id"]]
                if user:
                    contentList["user"] = user

    return contentLists
