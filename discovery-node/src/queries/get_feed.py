import datetime

from flask import request
from sqlalchemy import and_, desc, func, or_
from src.models.contentLists.contentList import ContentList
from src.models.social.follow import Follow
from src.models.social.repost import Repost, RepostType
from src.models.social.save import SaveType
from src.models.agreements.agreement import Agreement
from src.queries import response_name_constants
from src.queries.get_feed_es import get_feed_es
from src.queries.get_unpopulated_agreements import get_unpopulated_agreements
from src.queries.query_helpers import (
    get_pagination_vars,
    get_users_by_id,
    get_users_ids,
    paginate_query,
    populate_contentList_metadata,
    populate_agreement_metadata,
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
                created_contentLists_query = (
                    session.query(ContentList)
                    .filter(
                        ContentList.is_current == True,
                        ContentList.is_delete == False,
                        ContentList.is_private == False,
                        ContentList.contentList_owner_id.in_(followee_user_ids),
                    )
                    .order_by(desc(ContentList.created_at))
                )
                created_contentLists = paginate_query(created_contentLists_query, False).all()

                # get agreement ids for all agreements in contentLists
                contentList_agreement_ids = set()
                for contentList in created_contentLists:
                    for agreement in contentList.contentList_contents["agreement_ids"]:
                        contentList_agreement_ids.add(agreement["agreement"])

                # get all agreement objects for agreement ids
                contentList_agreements = get_unpopulated_agreements(session, contentList_agreement_ids)
                contentList_agreements_dict = {
                    agreement["agreement_id"]: agreement for agreement in contentList_agreements
                }

                # get all agreement ids that have same owner as contentList and created in "same action"
                # "same action": agreement created within [x time] before contentList creation
                agreements_to_dedupe = set()
                for contentList in created_contentLists:
                    for agreement_entry in contentList.contentList_contents["agreement_ids"]:
                        agreement = contentList_agreements_dict.get(agreement_entry["agreement"])
                        if not agreement:
                            continue
                        max_timedelta = datetime.timedelta(
                            minutes=agreementDedupeMaxMinutes
                        )
                        if (
                            (agreement["owner_id"] == contentList.contentList_owner_id)
                            and (agreement["created_at"] <= contentList.created_at)
                            and (
                                contentList.created_at - agreement["created_at"]
                                <= max_timedelta
                            )
                        ):
                            agreements_to_dedupe.add(agreement["agreement_id"])
                agreements_to_dedupe = list(agreements_to_dedupe)
            else:
                # No contentLists to consider
                agreements_to_dedupe = []
                created_contentLists = []

            # Query agreements posted by followees, sorted & paginated by created_at desc
            # exclude agreements that were posted in "same action" as contentList
            created_agreements_query = (
                session.query(Agreement)
                .filter(
                    Agreement.is_current == True,
                    Agreement.is_delete == False,
                    Agreement.is_unlisted == False,
                    Agreement.stem_of == None,
                    Agreement.owner_id.in_(followee_user_ids),
                    Agreement.agreement_id.notin_(agreements_to_dedupe),
                )
                .order_by(desc(Agreement.created_at))
            )
            created_agreements = paginate_query(created_agreements_query, False).all()

            # extract created_agreement_ids and created_contentList_ids
            created_agreement_ids = [agreement.agreement_id for agreement in created_agreements]
            created_contentList_ids = [
                contentList.contentList_id for contentList in created_contentLists
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
                            Repost.repost_type == RepostType.agreement,
                            Repost.repost_item_id.notin_(created_agreement_ids),
                        ),
                        and_(
                            Repost.repost_type != RepostType.agreement,
                            Repost.repost_item_id.notin_(created_contentList_ids),
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

            # build dict of agreement_id / contentList_id -> oldest followee repost timestamp from followee_reposts above
            agreement_repost_timestamp_dict = {}
            contentList_repost_timestamp_dict = {}
            for (
                repost_item_id,
                repost_type,
                oldest_followee_repost_timestamp,
            ) in followee_reposts:
                if repost_type == RepostType.agreement:
                    agreement_repost_timestamp_dict[
                        repost_item_id
                    ] = oldest_followee_repost_timestamp
                elif repost_type in (RepostType.contentList, RepostType.album):
                    contentList_repost_timestamp_dict[
                        repost_item_id
                    ] = oldest_followee_repost_timestamp

            # extract reposted_agreement_ids and reposted_contentList_ids
            reposted_agreement_ids = list(agreement_repost_timestamp_dict.keys())
            reposted_contentList_ids = list(contentList_repost_timestamp_dict.keys())

            # Query agreements reposted by followees
            reposted_agreements = session.query(Agreement).filter(
                Agreement.is_current == True,
                Agreement.is_delete == False,
                Agreement.is_unlisted == False,
                Agreement.stem_of == None,
                Agreement.agreement_id.in_(reposted_agreement_ids),
            )
            # exclude agreements already fetched from above, in case of "all" filter
            if feed_filter == "all":
                reposted_agreements = reposted_agreements.filter(
                    Agreement.agreement_id.notin_(created_agreement_ids)
                )
            reposted_agreements = reposted_agreements.order_by(desc(Agreement.created_at)).all()

            if not agreements_only:
                # Query contentLists reposted by followees, excluding contentLists already fetched from above
                reposted_contentLists = session.query(ContentList).filter(
                    ContentList.is_current == True,
                    ContentList.is_delete == False,
                    ContentList.is_private == False,
                    ContentList.contentList_id.in_(reposted_contentList_ids),
                )
                # exclude contentLists already fetched from above, in case of "all" filter
                if feed_filter == "all":
                    reposted_contentLists = reposted_contentLists.filter(
                        ContentList.contentList_id.notin_(created_contentList_ids)
                    )
                reposted_contentLists = reposted_contentLists.order_by(
                    desc(ContentList.created_at)
                ).all()
            else:
                reposted_contentLists = []

        if feed_filter == "original":
            agreements_to_process = created_agreements
            contentLists_to_process = created_contentLists
        elif feed_filter == "repost":
            agreements_to_process = reposted_agreements
            contentLists_to_process = reposted_contentLists
        else:
            agreements_to_process = created_agreements + reposted_agreements
            contentLists_to_process = created_contentLists + reposted_contentLists

        agreements = helpers.query_result_to_list(agreements_to_process)
        contentLists = helpers.query_result_to_list(contentLists_to_process)

        # define top level feed activity_timestamp to enable sorting
        # activity_timestamp: created_at if item created by followee, else reposted_at
        for agreement in agreements:
            if agreement["owner_id"] in followee_user_ids:
                agreement[response_name_constants.activity_timestamp] = agreement["created_at"]
            else:
                agreement[
                    response_name_constants.activity_timestamp
                ] = agreement_repost_timestamp_dict[agreement["agreement_id"]]
        for contentList in contentLists:
            if contentList["contentList_owner_id"] in followee_user_ids:
                contentList[response_name_constants.activity_timestamp] = contentList[
                    "created_at"
                ]
            else:
                contentList[
                    response_name_constants.activity_timestamp
                ] = contentList_repost_timestamp_dict[contentList["contentList_id"]]

        # bundle peripheral info into agreement and contentList objects
        agreement_ids = list(map(lambda agreement: agreement["agreement_id"], agreements))
        contentList_ids = list(map(lambda contentList: contentList["contentList_id"], contentLists))
        agreements = populate_agreement_metadata(session, agreement_ids, agreements, current_user_id)
        contentLists = populate_contentList_metadata(
            session,
            contentList_ids,
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
                if "contentList_owner_id" in result:
                    user = users[result["contentList_owner_id"]]
                    if user:
                        result["user"] = user
                elif "owner_id" in result:
                    user = users[result["owner_id"]]
                    if user:
                        result["user"] = user

    return feed_results
