from integration_tests.utils import populate_mock_db
from src.queries.get_repost_feed_for_user import _get_repost_feed_for_user
from src.utils.db_session import get_db


def test_get_repost_feed_for_user(app):
    """Tests that a repost feed for a user can be queried"""
    with app.app_context():
        db = get_db()

    test_entities = {
        "reposts": [
            # Note these reposts are in chronological order in addition
            # so the repost feed should pull them "backwards" for reverse chronological
            # sort order.
            {"user_id": 1, "repost_item_id": 5, "repost_type": "agreement"},
            {"user_id": 1, "repost_item_id": 2, "repost_type": "agreement"},
            {"user_id": 1, "repost_item_id": 3, "repost_type": "agreement"},
            {"user_id": 1, "repost_item_id": 1, "repost_type": "agreement"},
            {"user_id": 1, "repost_item_id": 4, "repost_type": "agreement"},
            {"user_id": 1, "repost_item_id": 4, "repost_type": "content list"},
            {"user_id": 1, "repost_item_id": 8, "repost_type": "album"},
            {"user_id": 1, "repost_item_id": 6, "repost_type": "agreement"},
        ],
        "agreements": [
            {"agreement_id": 1, "title": "agreement 1"},
            {"agreement_id": 2, "title": "agreement 2"},
            {"agreement_id": 3, "title": "agreement 3"},
            {"agreement_id": 4, "title": "agreement 4"},
            {"agreement_id": 5, "title": "agreement 5"},
            {"agreement_id": 6, "title": "agreement 6"},
            {"agreement_id": 7, "title": "agreement 7"},
            {"agreement_id": 8, "title": "agreement 8"},
        ],
        "content lists": [
            {"content list_id": 1, "content list_name": "content list 1"},
            {"content list_id": 2, "content list_name": "content list 2"},
            {"content list_id": 3, "content list_name": "content list 3"},
            {"content list_id": 4, "content list_name": "content list 4"},
            {"content list_id": 5, "content list_name": "content list 5"},
            {"content list_id": 6, "content list_name": "content list 6"},
            {"content list_id": 7, "content list_name": "content list 7"},
            {"content list_id": 8, "content list_name": "album 8"},
        ],
    }

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        repost_feed = _get_repost_feed_for_user(session, 1, {"limit": 10, "offset": 0})

    assert repost_feed[0]["title"] == "agreement 6"
    assert repost_feed[1]["content list_name"] == "album 8"
    assert repost_feed[2]["content list_name"] == "content list 4"
    assert repost_feed[3]["title"] == "agreement 4"
    assert repost_feed[4]["title"] == "agreement 1"
    assert repost_feed[5]["title"] == "agreement 3"
    assert repost_feed[6]["title"] == "agreement 2"
    assert repost_feed[7]["title"] == "agreement 5"


def test_get_repost_feed_for_user_limit_bounds(app):
    """
    Tests that a repost feed for a user can be queried and respect a limit
    with deleted agreements.
    """
    with app.app_context():
        db = get_db()

    test_entities = {
        "reposts": [
            # Note these reposts are in chronological order in addition
            # so the repost feed should pull them "backwards" for reverse chronological
            # sort order.
            {"user_id": 1, "repost_item_id": 5, "repost_type": "agreement"},
            {"user_id": 1, "repost_item_id": 2, "repost_type": "agreement"},
            {"user_id": 1, "repost_item_id": 3, "repost_type": "agreement"},
            {"user_id": 1, "repost_item_id": 1, "repost_type": "agreement"},
            {"user_id": 1, "repost_item_id": 4, "repost_type": "agreement"},
            {"user_id": 1, "repost_item_id": 4, "repost_type": "content list"},
            {"user_id": 1, "repost_item_id": 8, "repost_type": "album"},
            {"user_id": 1, "repost_item_id": 6, "repost_type": "agreement"},
        ],
        "agreements": [
            {"agreement_id": 1, "title": "agreement 1", "is_delete": True},
            {"agreement_id": 2, "title": "agreement 2"},
            {"agreement_id": 3, "title": "agreement 3"},
            {"agreement_id": 4, "title": "agreement 4"},
            {"agreement_id": 5, "title": "agreement 5"},
            {"agreement_id": 6, "title": "agreement 6"},
            {"agreement_id": 7, "title": "agreement 7"},
            {"agreement_id": 8, "title": "agreement 8"},
        ],
        "content lists": [
            {"content list_id": 1, "content list_name": "content list 1"},
            {"content list_id": 2, "content list_name": "content list 2"},
            {"content list_id": 3, "content list_name": "content list 3"},
            {"content list_id": 4, "content list_name": "content list 4"},
            {"content list_id": 5, "content list_name": "content list 5"},
            {"content list_id": 6, "content list_name": "content list 6"},
            {"content list_id": 7, "content list_name": "content list 7"},
            {"content list_id": 8, "content list_name": "album 8"},
        ],
    }

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        repost_feed = _get_repost_feed_for_user(session, 1, {"limit": 5, "offset": 0})

    # Query for 5 reposts. The problem is the 5th one was deleted, so
    # we only return 4 here. This is broken.
    # TODO fix me.
    assert repost_feed[0]["title"] == "agreement 6"
    assert repost_feed[1]["content list_name"] == "album 8"
    assert repost_feed[2]["content list_name"] == "content list 4"
    assert repost_feed[3]["title"] == "agreement 4"
    # Should skip agreement 1 because it is deleted
    assert repost_feed[4]["title"] == "agreement 3"
