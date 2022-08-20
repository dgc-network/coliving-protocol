import logging  # pylint: disable=C0302

import sqlalchemy
from flask.globals import request
from sqlalchemy import desc
from src import exceptions
from src.models.content lists.content list import ContentList
from src.models.social.repost import RepostType
from src.models.social.save import SaveType
from src.queries.query_helpers import (
    get_users_by_id,
    get_users_ids,
    paginate_query,
    populate_content list_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica
from src.utils.redis_cache import extract_key, use_redis_cache

logger = logging.getLogger(__name__)

UNPOPULATED_CONTENT_LIST_CACHE_DURATION_SEC = 10


def make_cache_key(args):
    cache_keys = {"user_id": args.get("user_id"), "with_users": args.get("with_users")}

    if args.get("content list_id"):
        ids = args.get("content list_id")
        ids = map(str, ids)
        ids = ",".join(ids)
        cache_keys["content list_id"] = ids

    key = extract_key(f"unpopulated-content list:{request.path}", cache_keys.items())
    return key


def get_content lists(args):
    content lists = []
    current_user_id = args.get("current_user_id")

    db = get_db_read_replica()
    with db.scoped_session() as session:

        def get_unpopulated_content lists():
            content list_query = session.query(ContentList).filter(ContentList.is_current == True)

            # content list ids filter if the optional query param is passed in
            if "content list_id" in args:
                content list_id_list = args.get("content list_id")
                try:
                    content list_query = content list_query.filter(
                        ContentList.content list_id.in_(content list_id_list)
                    )
                except ValueError as e:
                    raise exceptions.ArgumentError(
                        "Invalid value found in content list id list", e
                    )

            if "user_id" in args:
                user_id = args.get("user_id")
                # user id filter if the optional query param is passed in
                content list_query = content list_query.filter(
                    ContentList.content list_owner_id == user_id
                )

            # If no current_user_id, never show hidden content lists
            if not current_user_id:
                content list_query = content list_query.filter(ContentList.is_private == False)

            # Filter out deletes unless we're fetching explicitly by id
            if "content list_id" not in args:
                content list_query = content list_query.filter(ContentList.is_delete == False)

            content list_query = content list_query.order_by(desc(ContentList.created_at))
            content lists = paginate_query(content list_query).all()
            content lists = helpers.query_result_to_list(content lists)

            # if we passed in a current_user_id, filter out all privte content lists where
            # the owner_id doesn't match the current_user_id
            if current_user_id:
                content lists = list(
                    filter(
                        lambda content list: (not content list["is_private"])
                        or content list["content list_owner_id"] == current_user_id,
                        content lists,
                    )
                )

            # retrieve content list ids list
            content list_ids = list(
                map(lambda content list: content list["content list_id"], content lists)
            )

            return (content lists, content list_ids)

        try:
            # Get unpopulated content lists, either via
            # redis cache or via get_unpopulated_content lists
            key = make_cache_key(args)

            (content lists, content list_ids) = use_redis_cache(
                key, UNPOPULATED_CONTENT_LIST_CACHE_DURATION_SEC, get_unpopulated_content lists
            )

            # bundle peripheral info into content list results
            content lists = populate_content list_metadata(
                session,
                content list_ids,
                content lists,
                [RepostType.content list, RepostType.album],
                [SaveType.content list, SaveType.album],
                current_user_id,
            )

            if args.get("with_users", False):
                user_id_list = get_users_ids(content lists)
                users = get_users_by_id(session, user_id_list, current_user_id)
                for content list in content lists:
                    user = users[content list["content list_owner_id"]]
                    if user:
                        content list["user"] = user

        except sqlalchemy.orm.exc.NoResultFound:
            pass
    return content lists
