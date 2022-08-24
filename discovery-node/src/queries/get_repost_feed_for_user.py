from typing import Optional, TypedDict, cast

from sqlalchemy import desc
from sqlalchemy.orm.session import Session
from sqlalchemy.sql.elements import and_, or_
from src.models.content_lists.content_list import ContentList
from src.models.social.repost import Repost, RepostType
from src.models.social.save import SaveType
from src.models.agreements.agreement import Agreement
from src.models.users.user import User
from src.queries import response_name_constants
from src.queries.query_helpers import (
    add_query_pagination,
    get_users_by_id,
    get_users_ids,
    populate_content_list_metadata,
    populate_agreement_metadata,
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
        Array of agreements and contentLists (albums) interspersed ordered by
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
    # Outerjoin both agreements and contentLists to collect both
    # so that a single limit/offset pagination does what we intend when agreements or contentLists
    # are deleted.
    repost_query = (
        session.query(Repost, Agreement, ContentList)
        .outerjoin(
            Agreement,
            and_(
                Repost.repost_item_id == Agreement.agreement_id,
                Repost.repost_type == "agreement",
                Agreement.is_current == True,
                Agreement.is_delete == False,
                Agreement.is_unlisted == False,
                Agreement.stem_of == None,
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
            # Drop rows that have no join found for either agreement or contentList
            or_(Agreement.agreement_id != None, ContentList.content_list_id != None),
        )
        .order_by(
            desc(Repost.created_at),
            desc(Repost.repost_item_id),
            desc(Repost.repost_type),
        )
    )

    reposts = add_query_pagination(repost_query, limit, offset).all()
    # get agreement reposts from above
    agreement_reposts = [r[0] for r in reposts if r[1] is not None]
    agreement_reposts = helpers.query_result_to_list(agreement_reposts)

    # get contentList reposts from above
    content_list_reposts = [r[0] for r in reposts if r[2] is not None]
    content_list_reposts = helpers.query_result_to_list(content_list_reposts)

    # build agreement/contentList id --> repost dict from repost lists
    agreement_repost_dict = {repost["repost_item_id"]: repost for repost in agreement_reposts}
    content_list_repost_dict = {
        repost["repost_item_id"]: repost for repost in content_list_reposts
    }

    agreements = helpers.query_result_to_list(
        filter(None, [repost[1] for repost in reposts])
    )
    contentLists = helpers.query_result_to_list(
        filter(None, [repost[2] for repost in reposts])
    )

    # get agreement ids
    agreement_ids = [agreement["agreement_id"] for agreement in agreements]

    # get contentList ids
    content_list_ids = [contentList["content_list_id"] for contentList in contentLists]

    # populate full metadata
    agreements = populate_agreement_metadata(session, agreement_ids, agreements, current_user_id)
    contentLists = populate_content_list_metadata(
        session,
        content_list_ids,
        contentLists,
        [RepostType.contentList, RepostType.album],
        [SaveType.contentList, SaveType.album],
        current_user_id,
    )

    # add activity timestamps
    for agreement in agreements:
        agreement[response_name_constants.activity_timestamp] = agreement_repost_dict[
            agreement["agreement_id"]
        ]["created_at"]

    for contentList in contentLists:
        contentList[response_name_constants.activity_timestamp] = content_list_repost_dict[
            contentList["content_list_id"]
        ]["created_at"]

    unsorted_feed = agreements + contentLists

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
