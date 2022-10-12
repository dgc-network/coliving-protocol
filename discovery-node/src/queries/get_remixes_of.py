from flask.globals import request
from sqlalchemy import and_, case, desc, func
from src import exceptions
from src.models.social.repost import Repost, RepostType
from src.models.social.save import Save, SaveType
from src.models.agreements.aggregate_digital_content import AggregateAgreement
from src.models.agreements.remix import Remix
from src.models.agreements.digital_content import DigitalContent
from src.queries.get_unpopulated_digital_contents import get_unpopulated_digital_contents
from src.queries.query_helpers import (
    add_query_pagination,
    add_users_to_digital_contents,
    populate_digital_content_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica
from src.utils.redis_cache import extract_key, use_redis_cache

UNPOPULATED_REMIXES_CACHE_DURATION_SEC = 10


def make_cache_key(args):
    cache_keys = {
        "limit": args.get("limit"),
        "offset": args.get("offset"),
        "digital_content_id": args.get("digital_content_id"),
    }
    return extract_key(f"unpopulated-remix-parents:{request.path}", cache_keys.items())


def get_remixes_of(args):
    digital_content_id = args.get("digital_content_id")
    current_user_id = args.get("current_user_id")
    limit, offset = args.get("limit"), args.get("offset")
    db = get_db_read_replica()

    with db.scoped_session() as session:

        def get_unpopulated_remixes():

            # Fetch the parent digital_content to get the digital_content's owner id
            parent_digital_content_res = get_unpopulated_digital_contents(session, [digital_content_id], False, False)

            if not parent_digital_content_res or parent_digital_content_res[0] is None:
                raise exceptions.ArgumentError("Invalid digital_content_id provided")

            parent_digital_content = parent_digital_content_res[0]
            digital_content_owner_id = parent_digital_content["owner_id"]

            # Get the 'children' remix agreements
            # Use the digital_content owner id to fetch reposted/saved agreements returned first
            base_query = (
                session.query(DigitalContent)
                .join(
                    Remix,
                    and_(
                        Remix.child_digital_content_id == DigitalContent.digital_content_id,
                        Remix.parent_digital_content_id == digital_content_id,
                    ),
                )
                .outerjoin(
                    Save,
                    and_(
                        Save.save_item_id == DigitalContent.digital_content_id,
                        Save.save_type == SaveType.digital_content,
                        Save.is_current == True,
                        Save.is_delete == False,
                        Save.user_id == digital_content_owner_id,
                    ),
                )
                .outerjoin(
                    Repost,
                    and_(
                        Repost.repost_item_id == DigitalContent.digital_content_id,
                        Repost.user_id == digital_content_owner_id,
                        Repost.repost_type == RepostType.digital_content,
                        Repost.is_current == True,
                        Repost.is_delete == False,
                    ),
                )
                .outerjoin(
                    AggregateAgreement,
                    AggregateAgreement.digital_content_id == DigitalContent.digital_content_id,
                )
                .filter(
                    DigitalContent.is_current == True,
                    DigitalContent.is_delete == False,
                    DigitalContent.is_unlisted == False,
                )
                # 1. Co-signed agreements ordered by save + repost count
                # 2. Other agreements ordered by save + repost count
                .order_by(
                    desc(
                        # If there is no "co-sign" for the digital_content (no repost or save from the parent owner),
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
                    # Ties, pick latest digital_content id
                    desc(DigitalContent.digital_content_id),
                )
            )

            (agreements, count) = add_query_pagination(
                base_query, limit, offset, True, True
            )
            agreements = agreements.all()
            agreements = helpers.query_result_to_list(agreements)
            digital_content_ids = list(map(lambda digital_content: digital_content["digital_content_id"], agreements))
            return (agreements, digital_content_ids, count)

        key = make_cache_key(args)
        (agreements, digital_content_ids, count) = use_redis_cache(
            key, UNPOPULATED_REMIXES_CACHE_DURATION_SEC, get_unpopulated_remixes
        )

        agreements = populate_digital_content_metadata(session, digital_content_ids, agreements, current_user_id)
        if args.get("with_users", False):
            add_users_to_digital_contents(session, agreements, current_user_id)

    return {"agreements": agreements, "count": count}
