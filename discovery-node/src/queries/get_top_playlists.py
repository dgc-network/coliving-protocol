import enum
from typing import Optional, TypedDict

from sqlalchemy import desc
from src import exceptions
from src.models.content lists.aggregate_content list import AggregateContentList
from src.models.content lists.content list import ContentList
from src.models.social.repost import RepostType
from src.models.social.save import SaveType
from src.queries.query_helpers import (
    create_followee_content lists_subquery,
    decayed_score,
    filter_to_content list_mood,
    get_current_user_id,
    get_users_by_id,
    get_users_ids,
    populate_content list_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


class GetTopContentListsArgs(TypedDict):
    limit: Optional[int]
    mood: Optional[str]
    filter: Optional[str]
    with_users: Optional[bool]


class TopContentListKind(str, enum.Enum):
    content list = "content list"
    album = "album"


def get_top_content lists(kind: TopContentListKind, args: GetTopContentListsArgs):
    current_user_id = get_current_user_id(required=False)

    # Argument parsing and checking
    if kind not in ("content list", "album"):
        raise exceptions.ArgumentError(
            "Invalid kind provided, must be one of 'content list', 'album'"
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

        # If filtering by followees, set the content list view to be only content lists from
        # users that the current user follows.
        if query_filter == "followees":
            content lists_to_query = create_followee_content lists_subquery(
                session, current_user_id
            )
        # Otherwise, just query all content lists
        else:
            content lists_to_query = session.query(ContentList).subquery()

        # Create a decayed-score view of the content lists
        content list_query = (
            session.query(
                content lists_to_query,
                (AggregateContentList.repost_count + AggregateContentList.save_count).label(
                    "count"
                ),
                decayed_score(
                    AggregateContentList.repost_count + AggregateContentList.save_count,
                    content lists_to_query.c.created_at,
                ).label("score"),
            )
            .select_from(content lists_to_query)
            .join(
                AggregateContentList,
                AggregateContentList.content list_id == content lists_to_query.c.content list_id,
            )
            .filter(
                content lists_to_query.c.is_current == True,
                content lists_to_query.c.is_delete == False,
                content lists_to_query.c.is_private == False,
                content lists_to_query.c.is_album == (kind == "album"),
            )
        )

        # Filter by mood (no-op if no mood is provided)
        content list_query = filter_to_content list_mood(
            session, mood, content list_query, content lists_to_query
        )

        # Order and limit the content list query by score
        content list_query = content list_query.order_by(
            desc("score"), desc(content lists_to_query.c.content list_id)
        ).limit(limit)

        content list_results = content list_query.all()

        # Unzip query results into content lists and scores
        score_map = {}  # content list_id : score
        content lists = []
        if content list_results:
            for result in content list_results:
                # The content list is the portion of the query result before repost_count and score
                content list = result[0:-2]
                score = result[-1]

                # Convert the content list row tuple into a dictionary keyed by column name
                content list = helpers.tuple_to_model_dictionary(content list, ContentList)
                score_map[content list["content list_id"]] = score
                content lists.append(content list)

        content list_ids = list(map(lambda content list: content list["content list_id"], content lists))

        # Bundle peripheral info into content list results
        content lists = populate_content list_metadata(
            session,
            content list_ids,
            content lists,
            [RepostType.content list, RepostType.album],
            [SaveType.content list, SaveType.album],
            current_user_id,
        )
        # Add scores into the response
        for content list in content lists:
            content list["score"] = score_map[content list["content list_id"]]

        if args.get("with_users", False):
            user_id_list = get_users_ids(content lists)
            users = get_users_by_id(session, user_id_list)
            for content list in content lists:
                user = users[content list["content list_owner_id"]]
                if user:
                    content list["user"] = user

    return content lists
