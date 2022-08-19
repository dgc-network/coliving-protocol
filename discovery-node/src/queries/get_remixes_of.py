from flask.globals import request
from sqlalchemy import and_, case, desc, func
from src import exceptions
from src.models.social.repost import Repost, RepostType
from src.models.social.save import Save, SaveType
from src.models.agreements.aggregate_agreement import AggregateAgreement
from src.models.agreements.remix import Remix
from src.models.agreements.agreement import Agreement
from src.queries.get_unpopulated_agreements import get_unpopulated_agreements
from src.queries.query_helpers import (
    add_query_pagination,
    add_users_to_agreements,
    populate_agreement_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica
from src.utils.redis_cache import extract_key, use_redis_cache

UNPOPULATED_REMIXES_CACHE_DURATION_SEC = 10


def make_cache_key(args):
    cache_keys = {
        "limit": args.get("limit"),
        "offset": args.get("offset"),
        "agreement_id": args.get("agreement_id"),
    }
    return extract_key(f"unpopulated-remix-parents:{request.path}", cache_keys.items())


def get_remixes_of(args):
    agreement_id = args.get("agreement_id")
    current_user_id = args.get("current_user_id")
    limit, offset = args.get("limit"), args.get("offset")
    db = get_db_read_replica()

    with db.scoped_session() as session:

        def get_unpopulated_remixes():

            # Fetch the parent agreement to get the agreement's owner id
            parent_agreement_res = get_unpopulated_agreements(session, [agreement_id], False, False)

            if not parent_agreement_res or parent_agreement_res[0] is None:
                raise exceptions.ArgumentError("Invalid agreement_id provided")

            parent_agreement = parent_agreement_res[0]
            agreement_owner_id = parent_agreement["owner_id"]

            # Get the 'children' remix agreements
            # Use the agreement owner id to fetch reposted/saved agreements returned first
            base_query = (
                session.query(Agreement)
                .join(
                    Remix,
                    and_(
                        Remix.child_agreement_id == Agreement.agreement_id,
                        Remix.parent_agreement_id == agreement_id,
                    ),
                )
                .outerjoin(
                    Save,
                    and_(
                        Save.save_item_id == Agreement.agreement_id,
                        Save.save_type == SaveType.agreement,
                        Save.is_current == True,
                        Save.is_delete == False,
                        Save.user_id == agreement_owner_id,
                    ),
                )
                .outerjoin(
                    Repost,
                    and_(
                        Repost.repost_item_id == Agreement.agreement_id,
                        Repost.user_id == agreement_owner_id,
                        Repost.repost_type == RepostType.agreement,
                        Repost.is_current == True,
                        Repost.is_delete == False,
                    ),
                )
                .outerjoin(
                    AggregateAgreement,
                    AggregateAgreement.agreement_id == Agreement.agreement_id,
                )
                .filter(
                    Agreement.is_current == True,
                    Agreement.is_delete == False,
                    Agreement.is_unlisted == False,
                )
                # 1. Co-signed agreements ordered by save + repost count
                # 2. Other agreements ordered by save + repost count
                .order_by(
                    desc(
                        # If there is no "co-sign" for the agreement (no repost or save from the parent owner),
                        # defer to secondary sort
                        case(
                            [
                                (
                                    and_(
                                        Repost.created_at == None,
                                        Save.created_at == None,
                                    ),
                                    0,
                                ),
                            ],
                            else_=(
                                func.coalesce(AggregateAgreement.repost_count, 0)
                                + func.coalesce(AggregateAgreement.save_count, 0)
                            ),
                        )
                    ),
                    # Order by saves + reposts
                    desc(
                        func.coalesce(AggregateAgreement.repost_count, 0)
                        + func.coalesce(AggregateAgreement.save_count, 0)
                    ),
                    # Ties, pick latest agreement id
                    desc(Agreement.agreement_id),
                )
            )

            (agreements, count) = add_query_pagination(
                base_query, limit, offset, True, True
            )
            agreements = agreements.all()
            agreements = helpers.query_result_to_list(agreements)
            agreement_ids = list(map(lambda agreement: agreement["agreement_id"], agreements))
            return (agreements, agreement_ids, count)

        key = make_cache_key(args)
        (agreements, agreement_ids, count) = use_redis_cache(
            key, UNPOPULATED_REMIXES_CACHE_DURATION_SEC, get_unpopulated_remixes
        )

        agreements = populate_agreement_metadata(session, agreement_ids, agreements, current_user_id)
        if args.get("with_users", False):
            add_users_to_agreements(session, agreements, current_user_id)

    return {"agreements": agreements, "count": count}
