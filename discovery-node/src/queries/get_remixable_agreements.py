from sqlalchemy import desc
from sqlalchemy.orm import aliased
from src.models.agreements.aggregate_digital_content import AggregateAgreement
from src.models.agreements.stem import Stem
from src.models.agreements.digital_content import DigitalContent
from src.queries.query_helpers import (
    add_users_to_digital_contents,
    decayed_score,
    populate_digital_content_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_remixable_digital_contents(args):
    """Gets a list of remixable agreements"""
    db = get_db_read_replica()
    limit = args.get("limit", 25)
    current_user_id = args.get("current_user_id", None)

    StemAgreement = aliased(DigitalContent)

    with db.scoped_session() as session:
        # Subquery to get current agreements that have stems
        remixable_digital_contents_subquery = (
            session.query(DigitalContent)
            .join(Stem, Stem.parent_digital_content_id == DigitalContent.digital_content_id)
            .join(StemAgreement, Stem.child_digital_content_id == StemAgreement.digital_content_id)
            .filter(
                DigitalContent.is_current == True,
                DigitalContent.is_unlisted == False,
                DigitalContent.is_delete == False,
                StemAgreement.is_current == True,
                StemAgreement.is_unlisted == False,
                StemAgreement.is_delete == False,
            )
            .distinct(DigitalContent.digital_content_id)
            .subquery()
        )
        digital_content_alias = aliased(DigitalContent, remixable_digital_contents_subquery)

        count_subquery = session.query(
            AggregateAgreement.digital_content_id.label("id"),
            (AggregateAgreement.repost_count + AggregateAgreement.save_count).label("count"),
        ).subquery()

        query = (
            session.query(
                digital_content_alias,
                count_subquery.c["count"],
                decayed_score(count_subquery.c["count"], digital_content_alias.created_at).label(
                    "score"
                ),
            )
            .join(
                count_subquery,
                count_subquery.c["id"] == digital_content_alias.digital_content_id,
            )
            .order_by(desc("score"), desc(digital_content_alias.digital_content_id))
            .limit(limit)
        )

        results = query.all()

        agreements = []
        for result in results:
            digital_content = result[0]
            score = result[-1]
            digital_content = helpers.model_to_dictionary(digital_content)
            digital_content["score"] = score
            agreements.append(digital_content)

        digital_content_ids = list(map(lambda digital_content: digital_content["digital_content_id"], agreements))

        # Get user specific data for agreements
        agreements = populate_digital_content_metadata(session, digital_content_ids, agreements, current_user_id)

        if args.get("with_users", False):
            add_users_to_digital_contents(session, agreements, current_user_id)
        else:
            # Remove the user from the agreements
            agreements = [
                {key: val for key, val in dict.items() if key != "user"}
                for dict in agreements
            ]

    return agreements
