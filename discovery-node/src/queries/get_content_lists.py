import logging  # pylint: disable=C0302

import sqlalchemy
from flask.globals import request
from sqlalchemy import desc
from src import exceptions
from src.models.content_lists.content_list import ContentList
from src.models.social.repost import RepostType
from src.models.social.save import SaveType
from src.queries.query_helpers import (
    get_users_by_id,
    get_users_ids,
    paginate_query,
    populate_content_list_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica
from src.utils.redis_cache import extract_key, use_redis_cache

logger = logging.getLogger(__name__)

UNPOPULATED_CONTENT_LIST_CACHE_DURATION_SEC = 10


def make_cache_key(args):
    cache_keys = {"user_id": args.get("user_id"), "with_users": args.get("with_users")}

    if args.get("content_list_id"):
        ids = args.get("content_list_id")
        ids = map(str, ids)
        ids = ",".join(ids)
        cache_keys["content_list_id"] = ids

    key = extract_key(f"unpopulated-content-list:{request.path}", cache_keys.items())
    return key


def get_content_lists(args):
    contentLists = []
    current_user_id = args.get("current_user_id")

    db = get_db_read_replica()
    with db.scoped_session() as session:

        def get_unpopulated_content_lists():
            content_list_query = session.query(ContentList).filter(ContentList.is_current == True)

            # contentList ids filter if the optional query param is passed in
            if "content_list_id" in args:
                content_list_id_list = args.get("content_list_id")
                try:
                    content_list_query = content_list_query.filter(
                        ContentList.content_list_id.in_(content_list_id_list)
                    )
                except ValueError as e:
                    raise exceptions.ArgumentError(
                        "Invalid value found in contentList id list", e
                    )

            if "user_id" in args:
                user_id = args.get("user_id")
                # user id filter if the optional query param is passed in
                content_list_query = content_list_query.filter(
                    ContentList.content_list_owner_id == user_id
                )

            # If no current_user_id, never show hidden contentLists
            if not current_user_id:
                content_list_query = content_list_query.filter(ContentList.is_private == False)

            # Filter out deletes unless we're fetching explicitly by id
            if "content_list_id" not in args:
                content_list_query = content_list_query.filter(ContentList.is_delete == False)

            content_list_query = content_list_query.order_by(desc(ContentList.created_at))
            contentLists = paginate_query(content_list_query).all()
            contentLists = helpers.query_result_to_list(contentLists)

            # if we passed in a current_user_id, filter out all privte contentLists where
            # the owner_id doesn't match the current_user_id
            if current_user_id:
                contentLists = list(
                    filter(
                        lambda contentList: (not contentList["is_private"])
                        or contentList["content_list_owner_id"] == current_user_id,
                        contentLists,
                    )
                )

            # retrieve contentList ids list
            content_list_ids = list(
                map(lambda contentList: contentList["content_list_id"], contentLists)
            )

            return (contentLists, content_list_ids)

        try:
            # Get unpopulated contentLists, either via
            # redis cache or via get_unpopulated_content_lists
            key = make_cache_key(args)

            (contentLists, content_list_ids) = use_redis_cache(
                key, UNPOPULATED_CONTENT_LIST_CACHE_DURATION_SEC, get_unpopulated_content_lists
            )

            # bundle peripheral info into contentList results
            contentLists = populate_content_list_metadata(
                session,
                content_list_ids,
                contentLists,
                [RepostType.contentList, RepostType.album],
                [SaveType.contentList, SaveType.album],
                current_user_id,
            )

            if args.get("with_users", False):
                user_id_list = get_users_ids(contentLists)
                users = get_users_by_id(session, user_id_list, current_user_id)
                for contentList in contentLists:
                    user = users[contentList["content_list_owner_id"]]
                    if user:
                        contentList["user"] = user

        except sqlalchemy.orm.exc.NoResultFound:
            pass
    return contentLists
