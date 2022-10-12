import datetime

from flask import request
from sqlalchemy import and_, desc, func, or_
from src.models.content_lists.content_list import ContentList
from src.models.social.follow import Follow
from src.models.social.repost import Repost, RepostType
from src.models.social.save import SaveType
from src.models.agreements.digital_content import DigitalContent
from src.queries import response_name_constants
from src.queries.get_feed_es import get_feed_es
from src.queries.get_unpopulated_digital_contents import get_unpopulated_digital_contents
from src.queries.query_helpers import (
    get_pagination_vars,
    get_users_by_id,
    get_users_ids,
    paginate_query,
    populate_content_list_metadata,
    populate_digital_content_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica
from src.utils.elasticdsl import es_url

agreementDedupeMaxMinutes = 10


def get_feed(args):
    skip_es = request.args.get("es") == "0"
    use_es = es_url and not skip_es
    if use_es:
        try:
            (limit, _) = get_pagination_vars()
            return get_feed_es(args, limit)
        except:
            return get_feed_sql(args)
    else:
        return get_feed_sql(args)


def get_feed_sql(args):
    feed_results = []
    db = get_db_read_replica()

    feed_filter = args.get("filter")
    # Allow for fetching only agreements
    agreements_only = args.get("agreements_only", False)

    followee_user_ids = args.get("followee_user_ids", [])

    # Current user - user for whom feed is being generated
    current_user_id = args.get("user_id")
    with db.scoped_session() as session:
        # Generate list of users followed by current user, i.e. 'followees'
        if not followee_user_ids:
            followee_user_ids = (
                session.query(Follow.followee_user_id)
                .filter(
                    Follow.follower_user_id == current_user_id,
                    Follow.is_current == True,
                    Follow.is_delete == False,
                )
                .all()
            )
            followee_user_ids = [f[0] for f in followee_user_ids]

        # Fetch followee creations if requested
        if feed_filter in ["original", "all"]:
            if not agreements_only:
                # Query contentLists posted by followees, sorted and paginated by created_at desc
                created_content_lists_query = (
                    session.query(ContentList)
                    .filter(
                        ContentList.is_current == True,
                        ContentList.is_delete == False,
                        ContentList.is_private == False,
                        ContentList.content_list_owner_id.in_(followee_user_ids),
                    )
                    .order_by(desc(ContentList.created_at))
                )
                created_content_lists = paginate_query(created_content_lists_query, False).all()

                # get digital_content ids for all agreements in contentLists
                content_list_digital_content_ids = set()
                for contentList in created_content_lists:
                    for digital_content in contentList.content_list_contents["digital_content_ids"]:
                        content_list_digital_content_ids.add(digital_content["digital_content"])

                # get all digital_content objects for digital_content ids
                content_list_digital_contents = get_unpopulated_digital_contents(session, content_list_digital_content_ids)
                content_list_digital_contents_dict = {
                    digital_content["digital_content_id"]: digital_content for digital_content in content_list_digital_contents
                }

                # get all digital_content ids that have same owner as contentList and created in "same action"
                # "same action": digital_content created within [x time] before contentList creation
                agreements_to_dedupe = set()
                for contentList in created_content_lists:
                    for digital_content_entry in contentList.content_list_contents["digital_content_ids"]:
                        digital_content = content_list_digital_contents_dict.get(digital_content_entry["digital_content"])
                        if not digital_content:
                            continue
                        max_timedelta = datetime.timedelta(
                            minutes=agreementDedupeMaxMinutes
                        )
                        if (
                            (digital_content["owner_id"] == contentList.content_list_owner_id)
                            and (digital_content["created_at"] <= contentList.created_at)
                            and (
                                contentList.created_at - digital_content["created_at"]
                                <= max_timedelta
                            )
                        ):
                            agreements_to_dedupe.add(digital_content["digital_content_id"])
                agreements_to_dedupe = list(agreements_to_dedupe)
            else:
                # No contentLists to consider
                agreements_to_dedupe = []
                created_content_lists = []

            # Query agreements posted by followees, sorted & paginated by created_at desc
            # exclude agreements that were posted in "same action" as contentList
            created_digital_contents_query = (
                session.query(DigitalContent)
                .filter(
                    DigitalContent.is_current == True,
                    DigitalContent.is_delete == False,
                    DigitalContent.is_unlisted == False,
                    DigitalContent.stem_of == None,
                    DigitalContent.owner_id.in_(followee_user_ids),
                    DigitalContent.digital_content_id.notin_(agreements_to_dedupe),
                )
                .order_by(desc(DigitalContent.created_at))
            )
            created_digital_contents = paginate_query(created_digital_contents_query, False).all()

            # extract created_digital_content_ids and created_content_list_ids
            created_digital_content_ids = [digital_content.digital_content_id for digital_content in created_digital_contents]
            created_content_list_ids = [
                contentList.content_list_id for contentList in created_content_lists
            ]

        # Fetch followee reposts if requested
        if feed_filter in ["repost", "all"]:
            # query items reposted by followees, sorted by oldest followee repost of item;
            # paginated by most recent repost timestamp
            repost_subquery = session.query(Repost).filter(
                Repost.is_current == True,
                Repost.is_delete == False,
                Repost.user_id.in_(followee_user_ids),
            )
            # exclude items also created by followees to guarantee order determinism, in case of "all" filter
            if feed_filter == "all":
                repost_subquery = repost_subquery.filter(
                    or_(
                        and_(
                            Repost.repost_type == RepostType.digital_content,
                            Repost.repost_item_id.notin_(created_digital_content_ids),
                        ),
                        and_(
                            Repost.repost_type != RepostType.digital_content,
                            Repost.repost_item_id.notin_(created_content_list_ids),
                        ),
                    )
                )
            repost_subquery = repost_subquery.subquery()

            repost_query = (
                session.query(
                    repost_subquery.c.repost_item_id,
                    repost_subquery.c.repost_type,
                    func.min(repost_subquery.c.created_at).label("min_created_at"),
                )
                .group_by(
                    repost_subquery.c.repost_item_id, repost_subquery.c.repost_type
                )
                .order_by(desc("min_created_at"))
            )
            followee_reposts = paginate_query(repost_query, False).all()

            # build dict of digital_content_id / content_list_id -> oldest followee repost timestamp from followee_reposts above
            digital_content_repost_timestamp_dict = {}
            content_list_repost_timestamp_dict = {}
            for (
                repost_item_id,
                repost_type,
                oldest_followee_repost_timestamp,
            ) in followee_reposts:
                if repost_type == RepostType.digital_content:
                    digital_content_repost_timestamp_dict[
                        repost_item_id
                    ] = oldest_followee_repost_timestamp
                elif repost_type in (RepostType.contentList, RepostType.album):
                    content_list_repost_timestamp_dict[
                        repost_item_id
                    ] = oldest_followee_repost_timestamp

            # extract reposted_digital_content_ids and reposted_content_list_ids
            reposted_digital_content_ids = list(digital_content_repost_timestamp_dict.keys())
            reposted_content_list_ids = list(content_list_repost_timestamp_dict.keys())

            # Query agreements reposted by followees
            reposted_digital_contents = session.query(DigitalContent).filter(
                DigitalContent.is_current == True,
                DigitalContent.is_delete == False,
                DigitalContent.is_unlisted == False,
                DigitalContent.stem_of == None,
                DigitalContent.digital_content_id.in_(reposted_digital_content_ids),
            )
            # exclude agreements already fetched from above, in case of "all" filter
            if feed_filter == "all":
                reposted_digital_contents = reposted_digital_contents.filter(
                    DigitalContent.digital_content_id.notin_(created_digital_content_ids)
                )
            reposted_digital_contents = reposted_digital_contents.order_by(desc(DigitalContent.created_at)).all()

            if not agreements_only:
                # Query contentLists reposted by followees, excluding contentLists already fetched from above
                reposted_content_lists = session.query(ContentList).filter(
                    ContentList.is_current == True,
                    ContentList.is_delete == False,
                    ContentList.is_private == False,
                    ContentList.content_list_id.in_(reposted_content_list_ids),
                )
                # exclude contentLists already fetched from above, in case of "all" filter
                if feed_filter == "all":
                    reposted_content_lists = reposted_content_lists.filter(
                        ContentList.content_list_id.notin_(created_content_list_ids)
                    )
                reposted_content_lists = reposted_content_lists.order_by(
                    desc(ContentList.created_at)
                ).all()
            else:
                reposted_content_lists = []

        if feed_filter == "original":
            agreements_to_process = created_digital_contents
            content_lists_to_process = created_content_lists
        elif feed_filter == "repost":
            agreements_to_process = reposted_digital_contents
            content_lists_to_process = reposted_content_lists
        else:
            agreements_to_process = created_digital_contents + reposted_digital_contents
            content_lists_to_process = created_content_lists + reposted_content_lists

        agreements = helpers.query_result_to_list(agreements_to_process)
        contentLists = helpers.query_result_to_list(content_lists_to_process)

        # define top level feed activity_timestamp to enable sorting
        # activity_timestamp: created_at if item created by followee, else reposted_at
        for digital_content in agreements:
            if digital_content["owner_id"] in followee_user_ids:
                digital_content[response_name_constants.activity_timestamp] = digital_content["created_at"]
            else:
                digital_content[
                    response_name_constants.activity_timestamp
                ] = digital_content_repost_timestamp_dict[digital_content["digital_content_id"]]
        for contentList in contentLists:
            if contentList["content_list_owner_id"] in followee_user_ids:
                contentList[response_name_constants.activity_timestamp] = contentList[
                    "created_at"
                ]
            else:
                contentList[
                    response_name_constants.activity_timestamp
                ] = content_list_repost_timestamp_dict[contentList["content_list_id"]]

        # bundle peripheral info into digital_content and contentList objects
        digital_content_ids = list(map(lambda digital_content: digital_content["digital_content_id"], agreements))
        content_list_ids = list(map(lambda contentList: contentList["content_list_id"], contentLists))
        agreements = populate_digital_content_metadata(session, digital_content_ids, agreements, current_user_id)
        contentLists = populate_content_list_metadata(
            session,
            content_list_ids,
            contentLists,
            [RepostType.contentList, RepostType.album],
            [SaveType.contentList, SaveType.album],
            current_user_id,
        )

        # build combined feed of agreements and contentLists
        unsorted_feed = agreements + contentLists

        # sort feed based on activity_timestamp
        sorted_feed = sorted(
            unsorted_feed,
            key=lambda entry: entry[response_name_constants.activity_timestamp],
            reverse=True,
        )

        # truncate feed to requested limit
        (limit, _) = get_pagination_vars()
        feed_results = sorted_feed[0:limit]
        if "with_users" in args and args.get("with_users") != False:
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
