from integration_tests.utils import populate_mock_db
from src.queries.search_agreement_tags import search_agreement_tags
from src.utils.db_session import get_db


def test_search_agreement_tags(app):
    """Tests that search by tags works fopr agreements"""
    with app.app_context():
        db = get_db()

    test_entities = {
        "agreements": [
            {"agreement_id": 1, "tags": "", "owner_id": 1},
            {"agreement_id": 2, "owner_id": 1, "tags": "pop,rock,electric"},
            {"agreement_id": 3, "owner_id": 2},
            {"agreement_id": 4, "owner_id": 2, "tags": "funk,pop"},
            {"agreement_id": 5, "owner_id": 2, "tags": "funk,pop"},
            {"agreement_id": 6, "owner_id": 2, "tags": "funk,Funk,kpop"},
        ],
        "plays": [
            {"item_id": 1},
            {"item_id": 1},
            {"item_id": 2},
            {"item_id": 2},
            {"item_id": 4},
            {"item_id": 5},
            {"item_id": 5},
            {"item_id": 5},
        ],
    }

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        session.execute("REFRESH MATERIALIZED VIEW tag_agreement_user")
        args = {"search_str": "pop", "current_user_id": None, "limit": 10, "offset": 0}
        agreements = search_agreement_tags(session, args)

        assert len(agreements) == 3
        assert agreements[0]["agreement_id"] == 5  # First w/ 3 plays
        assert agreements[1]["agreement_id"] == 2  # Sec w/ 2 plays
        assert agreements[2]["agreement_id"] == 4  # Third w/ 1 plays

        # Agreement id 6 does not appear b/c kpop and pop are not exact matches
