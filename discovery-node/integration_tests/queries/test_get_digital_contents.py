from datetime import datetime

from integration_tests.utils import populate_mock_db
from src.queries.get_remixable_digital_contents import get_remixable_digital_contents
from src.queries.get_digital_contents import _get_digital_contents
from src.utils.db_session import get_db


def populate_digital_contents(db):
    test_entities = {
        "digitalContents": [
            {
                "digital_content_id": 1,
                "owner_id": 1287289,
                "release_date": "Fri Dec 20 2019 12:00:00 GMT-0800",
                "created_at": datetime(2018, 5, 17),
            },
            {"digital_content_id": 2, "owner_id": 1287289, "created_at": datetime(2018, 5, 18)},
            {
                "digital_content_id": 3,
                "owner_id": 1287289,
                "release_date": "Wed Dec 18 2019 12:00:00 GMT-0800",
                "created_at": datetime(2020, 5, 17),
            },
            {
                "digital_content_id": 4,
                "owner_id": 1287289,
                "release_date": "",
                "created_at": datetime(2018, 5, 19),
            },
            {
                "digital_content_id": 5,
                "owner_id": 1287289,
                "release_date": "garbage-should-not-parse",
                "created_at": datetime(2018, 5, 20),
            },
            {
                "digital_content_id": 6,
                "owner_id": 4,
                "release_date": "Wed Dec 18 2019 12:00:00 GMT-0800",
                "created_at": datetime(2020, 5, 17),
            },
            {
                "digital_content_id": 7,
                "owner_id": 4,
                "release_date": "",
                "created_at": datetime(2018, 5, 19),
            },
            {
                "digital_content_id": 8,
                "owner_id": 4,
                "release_date": "garbage-should-not-parse",
                "created_at": datetime(2018, 5, 20),
            },
            {
                "digital_content_id": 9,
                "owner_id": 4,
                "release_date": "Wed Dec 25 2019 12:00:00 GMT-0800",
                "created_at": datetime(2018, 5, 20),
                "is_unlisted": True,
            },
            {
                "digital_content_id": 10,
                "owner_id": 4,
                "release_date": "Wed Dec 25 2019 12:00:00 GMT-0800",
                "created_at": datetime(2018, 5, 21),
                "is_delete": True,
            },
            {
                "digital_content_id": 11,
                "owner_id": 1287289,
                "release_date": "Fri Dec 19 2019 12:00:00 GMT-0800",
                "created_at": datetime(2018, 5, 17),
                "is_unlisted": True,
            },
        ],
        "digital_content_routes": [
            {"slug": "digital-content-1", "owner_id": 1287289},
            {"slug": "digital-content-2", "owner_id": 1287289},
            {
                "slug": "different-digital-content",
                "owner_id": 4,
                "digital_content_id": 6,
            },
            {
                "slug": "digital-content-1",
                "owner_id": 4,
                "digital_content_id": 7,
            },
            {
                "slug": "digital-content-2",
                "owner_id": 4,
                "digital_content_id": 8,
            },
            {
                "slug": "hidden-digital-content",
                "owner_id": 4,
                "digital_content_id": 9,
            },
        ],
        "users": [
            {"user_id": 1287289, "handle": "some-test-user"},
            {"user_id": 4, "handle": "some-other-user"},
        ],
    }

    populate_mock_db(db, test_entities)


def test_get_digital_contents_by_date(app):
    """Test getting digitalContents ordering by date"""

    with app.app_context():
        db = get_db()

    populate_digital_contents(db)

    with db.scoped_session() as session:
        digitalContents = _get_digital_contents(
            session, {"user_id": 1287289, "offset": 0, "limit": 10, "sort": "date"}
        )

        assert len(digitalContents) == 5
        assert digitalContents[0]["digital_content_id"] == 1
        assert digitalContents[1]["digital_content_id"] == 3
        assert digitalContents[2]["digital_content_id"] == 5
        assert digitalContents[3]["digital_content_id"] == 4
        assert digitalContents[4]["digital_content_id"] == 2

        assert digitalContents[0]["permalink"] == "/some-test-user/digital-content-1"
        assert digitalContents[4]["permalink"] == "/some-test-user/digital-content-2"


def test_get_digital_contents_by_date_authed(app):
    """
    Test getting digitalContents ordering by date with an authed user.
    This test should produce unlisted digitalContents.
    """

    with app.app_context():
        db = get_db()

    populate_digital_contents(db)

    with db.scoped_session() as session:
        digitalContents = _get_digital_contents(
            session,
            {
                "user_id": 1287289,
                "authed_user_id": 1287289,
                "offset": 0,
                "limit": 10,
                "sort": "date",
            },
        )

        assert len(digitalContents) == 6
        assert digitalContents[0]["digital_content_id"] == 1
        assert digitalContents[1]["digital_content_id"] == 11
        assert digitalContents[2]["digital_content_id"] == 3
        assert digitalContents[3]["digital_content_id"] == 5
        assert digitalContents[4]["digital_content_id"] == 4
        assert digitalContents[5]["digital_content_id"] == 2


def test_get_digital_content_by_route(app):
    """Test getting digital_content by user handle and slug for route resolution"""
    with app.app_context():
        db = get_db()

        populate_digital_contents(db)

        with db.scoped_session() as session:
            digitalContents = _get_digital_contents(
                session,
                {
                    "routes": [{"owner_id": 1287289, "slug": "digital-content-1"}],
                    "offset": 0,
                    "limit": 10,
                },
            )

            assert len(digitalContents) == 1, "digital-content-1 is found for some-test-user"
            assert digitalContents[0]["owner_id"] == 1287289
            assert digitalContents[0]["permalink"] == "/some-test-user/digital-content-1"

            digitalContents = _get_digital_contents(
                session,
                {
                    "routes": [{"owner_id": 4, "slug": "digital-content-1"}],
                    "offset": 0,
                    "limit": 10,
                },
            )
            assert len(digitalContents) == 1, "digital-content-1 is still found for some-other-user"
            assert digitalContents[0]["owner_id"] == 4
            assert digitalContents[0]["permalink"] == "/some-other-user/digital-content-1"

            # Get an unlisted digital_content
            digitalContents = _get_digital_contents(
                session,
                {
                    "routes": [{"owner_id": 4, "slug": "hidden-digital-content"}],
                    "offset": 0,
                    "limit": 10,
                },
            )
            assert len(digitalContents) == 1
            assert digitalContents[0]["owner_id"] == 4
            assert digitalContents[0]["permalink"] == "/some-other-user/hidden-digital-content"

            # Make sure unlisted digitalContents are hidden without slug
            digitalContents = _get_digital_contents(
                session,
                {"user_id": 4, "id": [9], "offset": 0, "limit": 10},
            )
            assert len(digitalContents) == 0


def test_get_remixable_digital_contents(app):

    with app.app_context():
        db = get_db()

        populate_digital_contents(db)
        populate_mock_db(
            db,
            {
                "remixes": [
                    {"parent_digital_content_id": 9, "child_digital_content_id": 1},
                    {"parent_digital_content_id": 8, "child_digital_content_id": 1},
                ],
                "stems": [
                    {"parent_digital_content_id": 7, "child_digital_content_id": 1},
                    {"parent_digital_content_id": 6, "child_digital_content_id": 1},
                    # Verify that digitalContents with deleted stems are not returned
                    {"parent_digital_content_id": 5, "child_digital_content_id": 10},
                ],
                "saves": [{"user_id": 4, "save_item_id": 1}],
                "reposts": [{"user_id": 4, "repost_item_id": 1}],
            },
        )

        digitalContents = get_remixable_digital_contents({"with_users": True})
        assert len(digitalContents) == 2
        assert digitalContents[0]["user"]
