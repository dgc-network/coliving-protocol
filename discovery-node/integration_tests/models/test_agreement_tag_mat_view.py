from integration_tests.utils import populate_mock_db
from sqlalchemy import asc
from src.models.agreements.tag_agreement_user_matview import t_tag_agreement_user
from src.utils.db_session import get_db


def test_agreement_tag_mat_view(app):
    """Tests that genre metrics can be queried"""
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
        ]
    }

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        session.execute("REFRESH MATERIALIZED VIEW tag_agreement_user")
        user_1_tags = (
            session.query(t_tag_agreement_user)
            .filter(t_tag_agreement_user.c.owner_id == 1)
            .order_by(asc(t_tag_agreement_user.c.tag), asc(t_tag_agreement_user.c.agreement_id))
            .all()
        )
        user_2_tags = (
            session.query(t_tag_agreement_user)
            .filter(t_tag_agreement_user.c.owner_id == 2)
            .order_by(asc(t_tag_agreement_user.c.tag), asc(t_tag_agreement_user.c.agreement_id))
            .all()
        )
        user_4_tags = (
            session.query(t_tag_agreement_user)
            .filter(t_tag_agreement_user.c.owner_id == 4)
            .all()
        )

        assert len(user_1_tags) == 3
        assert user_1_tags[0].tag == "electric"
        assert user_1_tags[0].agreement_id == 2
        assert user_1_tags[1].tag == "pop"
        assert user_1_tags[1].agreement_id == 2
        assert user_1_tags[2].tag == "rock"
        assert user_1_tags[2].agreement_id == 2

        assert len(user_2_tags) == 6
        assert user_2_tags[0].tag == "funk"
        assert user_2_tags[0].agreement_id == 4
        assert user_2_tags[1].tag == "funk"
        assert user_2_tags[1].agreement_id == 5
        assert user_2_tags[2].tag == "funk"
        assert user_2_tags[2].agreement_id == 6
        assert user_2_tags[3].tag == "kpop"
        assert user_2_tags[3].agreement_id == 6
        assert user_2_tags[4].tag == "pop"
        assert user_2_tags[4].agreement_id == 4
        assert user_2_tags[5].tag == "pop"
        assert user_2_tags[5].agreement_id == 5

        assert not user_4_tags
