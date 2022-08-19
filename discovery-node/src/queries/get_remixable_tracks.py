from sqlalchemy import desc
from sqlalchemy.orm import aliased
from src.models.agreements.aggregate_agreement import AggregateAgreement
from src.models.agreements.stem import Stem
from src.models.agreements.agreement import Agreement
from src.queries.query_helpers import (
    add_users_to_agreements,
    decayed_score,
    populate_agreement_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_remixable_agreements(args):
    """Gets a list of remixable agreements"""
    db = get_db_read_replica()
    limit = args.get("limit", 25)
    current_user_id = args.get("current_user_id", None)

    StemAgreement = aliased(Agreement)

    with db.scoped_session() as session:
        # Subquery to get current agreements that have stems
        remixable_agreements_subquery = (
            session.query(Agreement)
            .join(Stem, Stem.parent_agreement_id == Agreement.agreement_id)
            .join(StemAgreement, Stem.child_agreement_id == StemAgreement.agreement_id)
            .filter(
                Agreement.is_current == True,
                Agreement.is_unlisted == False,
                Agreement.is_delete == False,
                StemAgreement.is_current == True,
                StemAgreement.is_unlisted == False,
                StemAgreement.is_delete == False,
            )
            .distinct(Agreement.agreement_id)
            .subquery()
        )
        agreement_alias = aliased(Agreement, remixable_agreements_subquery)

        count_subquery = session.query(
            AggregateAgreement.agreement_id.label("id"),
            (AggregateAgreement.repost_count + AggregateAgreement.save_count).label("count"),
        ).subquery()

        query = (
            session.query(
                agreement_alias,
                count_subquery.c["count"],
                decayed_score(count_subquery.c["count"], agreement_alias.created_at).label(
                    "score"
                ),
            )
            .join(
                count_subquery,
                count_subquery.c["id"] == agreement_alias.agreement_id,
            )
            .order_by(desc("score"), desc(agreement_alias.agreement_id))
            .limit(limit)
        )

        results = query.all()

        agreements = []
        for result in results:
            agreement = result[0]
            score = result[-1]
            agreement = helpers.model_to_dictionary(agreement)
            agreement["score"] = score
            agreements.append(agreement)

        agreement_ids = list(map(lambda agreement: agreement["agreement_id"], agreements))

        # Get user specific data for agreements
        agreements = populate_agreement_metadata(session, agreement_ids, agreements, current_user_id)

        if args.get("with_users", False):
            add_users_to_agreements(session, agreements, current_user_id)
        else:
            # Remove the user from the agreements
            agreements = [
                {key: val for key, val in dict.items() if key != "user"}
                for dict in agreements
            ]

    return agreements
