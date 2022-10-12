from sqlalchemy import desc
from sqlalchemy.orm import aliased
from src.models.digitalContents.aggregate_digital_content import AggregateDigitalContent
from src.models.digitalContents.stem import Stem
from src.models.digitalContents.digital_content import DigitalContent
from src.queries.query_helpers import (
    add_users_to_digital_contents,
    decayed_score,
    populate_digital_content_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_remixable_digital_contents(args):
    """Gets a list of remixable digitalContents"""
    db = get_db_read_replica()
    limit = args.get("limit", 25)
    current_user_id = args.get("current_user_id", None)

    StemDigitalContent = aliased(DigitalContent)

    with db.scoped_session() as session:
        # Subquery to get current digitalContents that have stems
        remixable_digital_contents_subquery = (
            session.query(DigitalContent)
            .join(Stem, Stem.parent_digital_content_id == DigitalContent.digital_content_id)
            .join(StemDigitalContent, Stem.child_digital_content_id == StemDigitalContent.digital_content_id)
            .filter(
                DigitalContent.is_current == True,
                DigitalContent.is_unlisted == False,
                DigitalContent.is_delete == False,
                StemDigitalContent.is_current == True,
                StemDigitalContent.is_unlisted == False,
                StemDigitalContent.is_delete == False,
            )
            .distinct(DigitalContent.digital_content_id)
            .subquery()
        )
        digital_content_alias = aliased(DigitalContent, remixable_digital_contents_subquery)

        count_subquery = session.query(
            AggregateDigitalContent.digital_content_id.label("id"),
            (AggregateDigitalContent.repost_count + AggregateDigitalContent.save_count).label("count"),
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

        digitalContents = []
        for result in results:
            digital_content = result[0]
            score = result[-1]
            digital_content = helpers.model_to_dictionary(digital_content)
            digital_content["score"] = score
            digitalContents.append(digital_content)

        digital_content_ids = list(map(lambda digital_content: digital_content["digital_content_id"], digitalContents))

        # Get user specific data for digitalContents
        digitalContents = populate_digital_content_metadata(session, digital_content_ids, digitalContents, current_user_id)

        if args.get("with_users", False):
            add_users_to_digital_contents(session, digitalContents, current_user_id)
        else:
            # Remove the user from the digitalContents
            digitalContents = [
                {key: val for key, val in dict.items() if key != "user"}
                for dict in digitalContents
            ]

    return digitalContents
