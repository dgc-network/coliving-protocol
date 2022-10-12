from typing import Optional, TypedDict, cast

from sqlalchemy import desc
from sqlalchemy.orm.session import Session
from sqlalchemy.sql.elements import and_, or_
from src.models.content_lists.content_list import ContentList
from src.models.social.repost import Repost, RepostType
from src.models.social.save import SaveType
from src.models.digitalContents.digital_content import DigitalContent
from src.models.users.user import User
from src.queries import response_name_constants
from src.queries.query_helpers import (
    add_query_pagination,
    get_users_by_id,
    get_users_ids,
    populate_content_list_metadata,
    populate_digital_content_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


class GetRepostFeedForUserArgs(TypedDict):
    offset: int
    limit: int
    handle: Optional[str]
    current_user_id: Optional[int]
    with_suers: Optional[bool]


def get_repost_feed_for_user(user_id: int, args: GetRepostFeedForUserArgs):
    """
    Gets the repost feed for a user (e.g. stalking a user)

    Args:
        user_id: number The user id to request the repost feed for
        args: GetRepostFeedForUserArgs The parsed args from the request

    Returns:
        Array of digitalContents and contentLists (albums) interspersed ordered by
        most recent repost
    """
    db = get_db_read_replica()
    with db.scoped_session() as session:
        return _get_repost_feed_for_user(session, user_id, args)


def _get_repost_feed_for_user(
    session: Session, user_id: int, args: GetRepostFeedForUserArgs
):
    feed_results = []
    current_user_id = args.get("current_user_id")
    limit = args.get("limit")
    offset = args.get("offset")
    if "handle" in args:
        handle = args.get("handle") or ""
        user_id = cast(
            int,
            session.query(User.user_id)
            .filter(User.handle_lc == handle.lower())
            .first(),
        )

    # Query all reposts by a user.
    # Outerjoin both digitalContents and contentLists to collect both
    # so that a single limit/offset pagination does what we intend when digitalContents or contentLists
    # are deleted.
    repost_query = (
        session.query(Repost, DigitalContent, ContentList)
        .outerjoin(
            DigitalContent,
            and_(
                Repost.repost_item_id == DigitalContent.digital_content_id,
                Repost.repost_type == "digital_content",
                DigitalContent.is_current == True,
                DigitalContent.is_delete == False,
                DigitalContent.is_unlisted == False,
                DigitalContent.stem_of == None,
            ),
        )
        .outerjoin(
            ContentList,
            and_(
                Repost.repost_item_id == ContentList.content_list_id,
                or_(Repost.repost_type == "content_list", Repost.repost_type == "album"),
                ContentList.is_current == True,
                ContentList.is_delete == False,
                ContentList.is_private == False,
            ),
        )
        .filter(
            Repost.is_current == True,
            Repost.is_delete == False,
            Repost.user_id == user_id,
            # Drop rows that have no join found for either digital_content or contentList
            or_(DigitalContent.digital_content_id != None, ContentList.content_list_id != None),
        )
        .order_by(
            desc(Repost.created_at),
            desc(Repost.repost_item_id),
            desc(Repost.repost_type),
        )
    )

    reposts = add_query_pagination(repost_query, limit, offset).all()
    # get digital_content reposts from above
    digital_content_reposts = [r[0] for r in reposts if r[1] is not None]
    digital_content_reposts = helpers.query_result_to_list(digital_content_reposts)

    # get contentList reposts from above
    content_list_reposts = [r[0] for r in reposts if r[2] is not None]
    content_list_reposts = helpers.query_result_to_list(content_list_reposts)

    # build digital_content/contentList id --> repost dict from repost lists
    digital_content_repost_dict = {repost["repost_item_id"]: repost for repost in digital_content_reposts}
    content_list_repost_dict = {
        repost["repost_item_id"]: repost for repost in content_list_reposts
    }

    digitalContents = helpers.query_result_to_list(
        filter(None, [repost[1] for repost in reposts])
    )
    contentLists = helpers.query_result_to_list(
        filter(None, [repost[2] for repost in reposts])
    )

    # get digital_content ids
    digital_content_ids = [digital_content["digital_content_id"] for digital_content in digitalContents]

    # get contentList ids
    content_list_ids = [contentList["content_list_id"] for contentList in contentLists]

    # populate full metadata
    digitalContents = populate_digital_content_metadata(session, digital_content_ids, digitalContents, current_user_id)
    contentLists = populate_content_list_metadata(
        session,
        content_list_ids,
        contentLists,
        [RepostType.contentList, RepostType.album],
        [SaveType.contentList, SaveType.album],
        current_user_id,
    )

    # add activity timestamps
    for digital_content in digitalContents:
        digital_content[response_name_constants.activity_timestamp] = digital_content_repost_dict[
            digital_content["digital_content_id"]
        ]["created_at"]

    for contentList in contentLists:
        contentList[response_name_constants.activity_timestamp] = content_list_repost_dict[
            contentList["content_list_id"]
        ]["created_at"]

    unsorted_feed = digitalContents + contentLists

    # sort feed by repost timestamp desc
    feed_results = sorted(
        unsorted_feed,
        key=lambda entry: entry[response_name_constants.activity_timestamp],
        reverse=True,
    )

    if args.get("with_users", False):
        user_id_list = get_users_ids(feed_results)
        users = get_users_by_id(session, user_id_list)
        for result in feed_results:
            if "content_list_owner_id" in result:
                user = users[result["content_list_owner_id"]]
                if user:
                    result["user"] = user
            elif "owner_id" in result:
                user = users[result["owner_id"]]
                if user:
                    result["user"] = user

    return feed_results
