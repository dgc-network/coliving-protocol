from src.models.agreements.stem import Stem
from src.models.agreements.digital_content import DigitalContent
from src.utils import helpers
from src.utils.db_session import get_db_read_replica


def get_stems_of(digital_content_id):
    db = get_db_read_replica()
    stems = []
    with db.scoped_session() as session:
        parent_not_deleted_subquery = (
            session.query(DigitalContent.is_delete).filter(DigitalContent.digital_content_id == digital_content_id).subquery()
        )

        stem_results = (
            session.query(DigitalContent)
            .join(
                Stem,
                Stem.child_digital_content_id == DigitalContent.digital_content_id,
            )
            .filter(DigitalContent.is_current == True, DigitalContent.is_delete == False)
            .filter(Stem.parent_digital_content_id == digital_content_id)
            .filter(parent_not_deleted_subquery.c.is_delete == False)
            .all()
        )
        stems = helpers.query_result_to_list(stem_results)

    return stems
