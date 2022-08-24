import enum
from typing import Optional, TypedDict

from sqlalchemy import desc
from src import exceptions
from src.models.content_lists.aggregate_content_list import AggregateContentList
from src.models.content_lists.content_list import ContentList
from src.models.social.repost import RepostType
from src.models.social.save import SaveType
from src.queries.query_helpers import (
    create_followee_content_lists_subquery,
    decayed_score,
    filter_to_content_list_mood,
    get_current_user_id,
    get_users_by_id,
    get_users_ids,
    populate_content_list_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


class GetTopContentListsArgs(TypedDict):
    limit: Optional[int]
    mood: Optional[str]
    filter: Optional[str]
    with_users: Optional[bool]


class TopContentListKind(str, enum.Enum):
    contentList = "content_list"
    album = "album"


def get_top_content_lists(kind: TopContentListKind, args: GetTopContentListsArgs):
    current_user_id = get_current_user_id(required=False)

    # Argument parsing and checking
    if kind not in ("content_list", "album"):
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
            content_lists_to_query = create_followee_content_lists_subquery(
                session, current_user_id
            )
        # Otherwise, just query all contentLists
        else:
            content_lists_to_query = session.query(ContentList).subquery()

        # Create a decayed-score view of the contentLists
        content_list_query = (
            session.query(
                content_lists_to_query,
                (AggregateContentList.repost_count + AggregateContentList.save_count).label(
                    "count"
                ),
                decayed_score(
                    AggregateContentList.repost_count + AggregateContentList.save_count,
                    content_lists_to_query.c.created_at,
                ).label("score"),
            )
            .select_from(content_lists_to_query)
            .join(
                AggregateContentList,
                AggregateContentList.content_list_id == content_lists_to_query.c.content_list_id,
            )
            .filter(
                content_lists_to_query.c.is_current == True,
                content_lists_to_query.c.is_delete == False,
                content_lists_to_query.c.is_private == False,
                content_lists_to_query.c.is_album == (kind == "album"),
            )
        )

        # Filter by mood (no-op if no mood is provided)
        content_list_query = filter_to_content_list_mood(
            session, mood, content_list_query, content_lists_to_query
        )

        # Order and limit the contentList query by score
        content_list_query = content_list_query.order_by(
            desc("score"), desc(content_lists_to_query.c.content_list_id)
        ).limit(limit)

        content_list_results = content_list_query.all()

        # Unzip query results into contentLists and scores
        score_map = {}  # content_list_id : score
        contentLists = []
        if content_list_results:
            for result in content_list_results:
                # The contentList is the portion of the query result before repost_count and score
                contentList = result[0:-2]
                score = result[-1]

                # Convert the contentList row tuple into a dictionary keyed by column name
                contentList = helpers.tuple_to_model_dictionary(contentList, ContentList)
                score_map[contentList["content_list_id"]] = score
                contentLists.append(contentList)

        content_list_ids = list(map(lambda contentList: contentList["content_list_id"], contentLists))

        # Bundle peripheral info into contentList results
        contentLists = populate_content_list_metadata(
            session,
            content_list_ids,
            contentLists,
            [RepostType.contentList, RepostType.album],
            [SaveType.contentList, SaveType.album],
            current_user_id,
        )
        # Add scores into the response
        for contentList in contentLists:
            contentList["score"] = score_map[contentList["content_list_id"]]

        if args.get("with_users", False):
            user_id_list = get_users_ids(contentLists)
            users = get_users_by_id(session, user_id_list)
            for contentList in contentLists:
                user = users[contentList["content_list_owner_id"]]
                if user:
                    contentList["user"] = user

    return contentLists
