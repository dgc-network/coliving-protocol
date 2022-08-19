from src.models.agreements.stem import Stem
from src.models.agreements.agreement import Agreement
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_stems_of(agreement_id):
    db = get_db_read_replica()
    stems = []
    with db.scoped_session() as session:
        parent_not_deleted_subquery = (
            session.query(Agreement.is_delete).filter(Agreement.agreement_id == agreement_id).subquery()
        )

        stem_results = (
            session.query(Agreement)
            .join(
                Stem,
                Stem.child_agreement_id == Agreement.agreement_id,
            )
            .filter(Agreement.is_current == True, Agreement.is_delete == False)
            .filter(Stem.parent_agreement_id == agreement_id)
            .filter(parent_not_deleted_subquery.c.is_delete == False)
            .all()
        )
        stems = helpers.query_result_to_list(stem_results)

    return stems
