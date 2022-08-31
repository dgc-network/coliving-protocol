from datetime import datetime

from integration_tests.utils import populate_mock_db
from src.queries.get_remixable_agreements import get_remixable_agreements
from src.queries.get_agreements import _get_agreements
from src.utils.db_session import get_db


def populate_agreements(db):
    test_entities = {
        "agreements": [
            {
                "agreement_id": 1,
                "owner_id": 1287289,
                "release_date": "Fri Dec 20 2019 12:00:00 GMT-0800",
                "created_at": datetime(2018, 5, 17),
            },
            {"agreement_id": 2, "owner_id": 1287289, "created_at": datetime(2018, 5, 18)},
            {
                "agreement_id": 3,
                "owner_id": 1287289,
                "release_date": "Wed Dec 18 2019 12:00:00 GMT-0800",
                "created_at": datetime(2020, 5, 17),
            },
            {
                "agreement_id": 4,
                "owner_id": 1287289,
                "release_date": "",
                "created_at": datetime(2018, 5, 19),
            },
            {
                "agreement_id": 5,
                "owner_id": 1287289,
                "release_date": "garbage-should-not-parse",
                "created_at": datetime(2018, 5, 20),
            },
            {
                "agreement_id": 6,
                "owner_id": 4,
                "release_date": "Wed Dec 18 2019 12:00:00 GMT-0800",
                "created_at": datetime(2020, 5, 17),
            },
            {
                "agreement_id": 7,
                "owner_id": 4,
                "release_date": "",
                "created_at": datetime(2018, 5, 19),
            },
            {
                "agreement_id": 8,
                "owner_id": 4,
                "release_date": "garbage-should-not-parse",
                "created_at": datetime(2018, 5, 20),
            },
            {
                "agreement_id": 9,
                "owner_id": 4,
                "release_date": "Wed Dec 25 2019 12:00:00 GMT-0800",
                "created_at": datetime(2018, 5, 20),
                "is_unlisted": True,
            },
            {
                "agreement_id": 10,
                "owner_id": 4,
                "release_date": "Wed Dec 25 2019 12:00:00 GMT-0800",
                "created_at": datetime(2018, 5, 21),
                "is_delete": True,
            },
            {
                "agreement_id": 11,
                "owner_id": 1287289,
                "release_date": "Fri Dec 19 2019 12:00:00 GMT-0800",
                "created_at": datetime(2018, 5, 17),
                "is_unlisted": True,
            },
        ],
        "agreement_routes": [
            {"slug": "agreement-1", "owner_id": 1287289},
            {"slug": "agreement-2", "owner_id": 1287289},
            {
                "slug": "different-agreement",
                "owner_id": 4,
                "agreement_id": 6,
            },
            {
                "slug": "agreement-1",
                "owner_id": 4,
                "agreement_id": 7,
            },
            {
                "slug": "agreement-2",
                "owner_id": 4,
                "agreement_id": 8,
            },
            {
                "slug": "hidden-agreement",
                "owner_id": 4,
                "agreement_id": 9,
            },
        ],
        "users": [
            {"user_id": 1287289, "handle": "some-test-user"},
            {"user_id": 4, "handle": "some-other-user"},
        ],
    }

    populate_mock_db(db, test_entities)


def test_get_agreements_by_date(app):
    """Test getting agreements ordering by date"""

    with app.app_context():
        db = get_db()

    populate_agreements(db)

    with db.scoped_session() as session:
        agreements = _get_agreements(
            session, {"user_id": 1287289, "offset": 0, "limit": 10, "sort": "date"}
        )

        assert len(agreements) == 5
        assert agreements[0]["agreement_id"] == 1
        assert agreements[1]["agreement_id"] == 3
        assert agreements[2]["agreement_id"] == 5
        assert agreements[3]["agreement_id"] == 4
        assert agreements[4]["agreement_id"] == 2

        assert agreements[0]["permalink"] == "/some-test-user/agreement-1"
        assert agreements[4]["permalink"] == "/some-test-user/agreement-2"


def test_get_agreements_by_date_authed(app):
    """
    Test getting agreements ordering by date with an authed user.
    This test should produce unlisted agreements.
    """

    with app.app_context():
        db = get_db()

    populate_agreements(db)

    with db.scoped_session() as session:
        agreements = _get_agreements(
            session,
            {
                "user_id": 1287289,
                "authed_user_id": 1287289,
                "offset": 0,
                "limit": 10,
                "sort": "date",
            },
        )

        assert len(agreements) == 6
        assert agreements[0]["agreement_id"] == 1
        assert agreements[1]["agreement_id"] == 11
        assert agreements[2]["agreement_id"] == 3
        assert agreements[3]["agreement_id"] == 5
        assert agreements[4]["agreement_id"] == 4
        assert agreements[5]["agreement_id"] == 2


def test_get_agreement_by_route(app):
    """Test getting agreement by user handle and slug for route resolution"""
    with app.app_context():
        db = get_db()

        populate_agreements(db)

        with db.scoped_session() as session:
            agreements = _get_agreements(
                session,
                {
                    "routes": [{"owner_id": 1287289, "slug": "agreement-1"}],
                    "offset": 0,
                    "limit": 10,
                },
            )

            assert len(agreements) == 1, "agreement-1 is found for some-test-user"
            assert agreements[0]["owner_id"] == 1287289
            assert agreements[0]["permalink"] == "/some-test-user/agreement-1"

            agreements = _get_agreements(
                session,
                {
                    "routes": [{"owner_id": 4, "slug": "agreement-1"}],
                    "offset": 0,
                    "limit": 10,
                },
            )
            assert len(agreements) == 1, "agreement-1 is still found for some-other-user"
            assert agreements[0]["owner_id"] == 4
            assert agreements[0]["permalink"] == "/some-other-user/agreement-1"

            # Get an unlisted agreement
            agreements = _get_agreements(
                session,
                {
                    "routes": [{"owner_id": 4, "slug": "hidden-agreement"}],
                    "offset": 0,
                    "limit": 10,
                },
            )
            assert len(agreements) == 1
            assert agreements[0]["owner_id"] == 4
            assert agreements[0]["permalink"] == "/some-other-user/hidden-agreement"

            # Make sure unlisted agreements are hidden without slug
            agreements = _get_agreements(
                session,
                {"user_id": 4, "id": [9], "offset": 0, "limit": 10},
            )
            assert len(agreements) == 0


def test_get_remixable_agreements(app):

    with app.app_context():
        db = get_db()

        populate_agreements(db)
        populate_mock_db(
            db,
            {
                "remixes": [
                    {"parent_agreement_id": 9, "child_agreement_id": 1},
                    {"parent_agreement_id": 8, "child_agreement_id": 1},
                ],
                "stems": [
                    {"parent_agreement_id": 7, "child_agreement_id": 1},
                    {"parent_agreement_id": 6, "child_agreement_id": 1},
                    # Verify that agreements with deleted stems are not returned
                    {"parent_agreement_id": 5, "child_agreement_id": 10},
                ],
                "saves": [{"user_id": 4, "save_item_id": 1}],
                "reposts": [{"user_id": 4, "repost_item_id": 1}],
            },
        )

        agreements = get_remixable_agreements({"with_users": True})
        assert len(agreements) == 2
        assert agreements[0]["user"]
