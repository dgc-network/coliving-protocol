import logging  # pylint: disable=C0302

import sqlalchemy
from flask.globals import request
from sqlalchemy import desc
from src import exceptions
from src.models.contentLists.contentList import ContentList
from src.models.social.repost import RepostType
from src.models.social.save import SaveType
from src.queries.query_helpers import (
    get_users_by_id,
    get_users_ids,
    paginate_query,
    populate_contentList_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica
from src.utils.redis_cache import extract_key, use_redis_cache

logger = logging.getLogger(__name__)

UNPOPULATED_CONTENT_LIST_CACHE_DURATION_SEC = 10


def make_cache_key(args):
    cache_keys = {"user_id": args.get("user_id"), "with_users": args.get("with_users")}

    if args.get("contentList_id"):
        ids = args.get("contentList_id")
        ids = map(str, ids)
        ids = ",".join(ids)
        cache_keys["contentList_id"] = ids

    key = extract_key(f"unpopulated-contentList:{request.path}", cache_keys.items())
    return key


def get_contentLists(args):
    contentLists = []
    current_user_id = args.get("current_user_id")

    db = get_db_read_replica()
    with db.scoped_session() as session:

        def get_unpopulated_contentLists():
            contentList_query = session.query(ContentList).filter(ContentList.is_current == True)

            # contentList ids filter if the optional query param is passed in
            if "contentList_id" in args:
                contentList_id_list = args.get("contentList_id")
                try:
                    contentList_query = contentList_query.filter(
                        ContentList.contentList_id.in_(contentList_id_list)
                    )
                except ValueError as e:
                    raise exceptions.ArgumentError(
                        "Invalid value found in contentList id list", e
                    )

            if "user_id" in args:
                user_id = args.get("user_id")
                # user id filter if the optional query param is passed in
                contentList_query = contentList_query.filter(
                    ContentList.contentList_owner_id == user_id
                )

            # If no current_user_id, never show hidden contentLists
            if not current_user_id:
                contentList_query = contentList_query.filter(ContentList.is_private == False)

            # Filter out deletes unless we're fetching explicitly by id
            if "contentList_id" not in args:
                contentList_query = contentList_query.filter(ContentList.is_delete == False)

            contentList_query = contentList_query.order_by(desc(ContentList.created_at))
            contentLists = paginate_query(contentList_query).all()
            contentLists = helpers.query_result_to_list(contentLists)

            # if we passed in a current_user_id, filter out all privte contentLists where
            # the owner_id doesn't match the current_user_id
            if current_user_id:
                contentLists = list(
                    filter(
                        lambda contentList: (not contentList["is_private"])
                        or contentList["contentList_owner_id"] == current_user_id,
                        contentLists,
                    )
                )

            # retrieve contentList ids list
            contentList_ids = list(
                map(lambda contentList: contentList["contentList_id"], contentLists)
            )

            return (contentLists, contentList_ids)

        try:
            # Get unpopulated contentLists, either via
            # redis cache or via get_unpopulated_contentLists
            key = make_cache_key(args)

            (contentLists, contentList_ids) = use_redis_cache(
                key, UNPOPULATED_CONTENT_LIST_CACHE_DURATION_SEC, get_unpopulated_contentLists
            )

            # bundle peripheral info into contentList results
            contentLists = populate_contentList_metadata(
                session,
                contentList_ids,
                contentLists,
                [RepostType.contentList, RepostType.album],
                [SaveType.contentList, SaveType.album],
                current_user_id,
            )

            if args.get("with_users", False):
                user_id_list = get_users_ids(contentLists)
                users = get_users_by_id(session, user_id_list, current_user_id)
                for contentList in contentLists:
                    user = users[contentList["contentList_owner_id"]]
                    if user:
                        contentList["user"] = user

        except sqlalchemy.orm.exc.NoResultFound:
            pass
    return contentLists
