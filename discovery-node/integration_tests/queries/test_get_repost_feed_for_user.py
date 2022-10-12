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
            {"user_id": 1, "repost_item_id": 5, "repost_type": "digital_content"},
            {"user_id": 1, "repost_item_id": 2, "repost_type": "digital_content"},
            {"user_id": 1, "repost_item_id": 3, "repost_type": "digital_content"},
            {"user_id": 1, "repost_item_id": 1, "repost_type": "digital_content"},
            {"user_id": 1, "repost_item_id": 4, "repost_type": "digital_content"},
            {"user_id": 1, "repost_item_id": 4, "repost_type": "content_list"},
            {"user_id": 1, "repost_item_id": 8, "repost_type": "album"},
            {"user_id": 1, "repost_item_id": 6, "repost_type": "digital_content"},
        ],
        "agreements": [
            {"digital_content_id": 1, "title": "digital_content 1"},
            {"digital_content_id": 2, "title": "digital_content 2"},
            {"digital_content_id": 3, "title": "digital_content 3"},
            {"digital_content_id": 4, "title": "digital_content 4"},
            {"digital_content_id": 5, "title": "digital_content 5"},
            {"digital_content_id": 6, "title": "digital_content 6"},
            {"digital_content_id": 7, "title": "digital_content 7"},
            {"digital_content_id": 8, "title": "digital_content 8"},
        ],
        "content_lists": [
            {"content_list_id": 1, "content_list_name": "contentList 1"},
            {"content_list_id": 2, "content_list_name": "contentList 2"},
            {"content_list_id": 3, "content_list_name": "contentList 3"},
            {"content_list_id": 4, "content_list_name": "contentList 4"},
            {"content_list_id": 5, "content_list_name": "contentList 5"},
            {"content_list_id": 6, "content_list_name": "contentList 6"},
            {"content_list_id": 7, "content_list_name": "contentList 7"},
            {"content_list_id": 8, "content_list_name": "album 8"},
        ],
    }

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        repost_feed = _get_repost_feed_for_user(session, 1, {"limit": 10, "offset": 0})

    assert repost_feed[0]["title"] == "digital_content 6"
    assert repost_feed[1]["content_list_name"] == "album 8"
    assert repost_feed[2]["content_list_name"] == "contentList 4"
    assert repost_feed[3]["title"] == "digital_content 4"
    assert repost_feed[4]["title"] == "digital_content 1"
    assert repost_feed[5]["title"] == "digital_content 3"
    assert repost_feed[6]["title"] == "digital_content 2"
    assert repost_feed[7]["title"] == "digital_content 5"


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
            {"user_id": 1, "repost_item_id": 5, "repost_type": "digital_content"},
            {"user_id": 1, "repost_item_id": 2, "repost_type": "digital_content"},
            {"user_id": 1, "repost_item_id": 3, "repost_type": "digital_content"},
            {"user_id": 1, "repost_item_id": 1, "repost_type": "digital_content"},
            {"user_id": 1, "repost_item_id": 4, "repost_type": "digital_content"},
            {"user_id": 1, "repost_item_id": 4, "repost_type": "content_list"},
            {"user_id": 1, "repost_item_id": 8, "repost_type": "album"},
            {"user_id": 1, "repost_item_id": 6, "repost_type": "digital_content"},
        ],
        "agreements": [
            {"digital_content_id": 1, "title": "digital_content 1", "is_delete": True},
            {"digital_content_id": 2, "title": "digital_content 2"},
            {"digital_content_id": 3, "title": "digital_content 3"},
            {"digital_content_id": 4, "title": "digital_content 4"},
            {"digital_content_id": 5, "title": "digital_content 5"},
            {"digital_content_id": 6, "title": "digital_content 6"},
            {"digital_content_id": 7, "title": "digital_content 7"},
            {"digital_content_id": 8, "title": "digital_content 8"},
        ],
        "content_lists": [
            {"content_list_id": 1, "content_list_name": "contentList 1"},
            {"content_list_id": 2, "content_list_name": "contentList 2"},
            {"content_list_id": 3, "content_list_name": "contentList 3"},
            {"content_list_id": 4, "content_list_name": "contentList 4"},
            {"content_list_id": 5, "content_list_name": "contentList 5"},
            {"content_list_id": 6, "content_list_name": "contentList 6"},
            {"content_list_id": 7, "content_list_name": "contentList 7"},
            {"content_list_id": 8, "content_list_name": "album 8"},
        ],
    }

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        repost_feed = _get_repost_feed_for_user(session, 1, {"limit": 5, "offset": 0})

    # Query for 5 reposts. The problem is the 5th one was deleted, so
    # we only return 4 here. This is broken.
    # TODO fix me.
    assert repost_feed[0]["title"] == "digital_content 6"
    assert repost_feed[1]["content_list_name"] == "album 8"
    assert repost_feed[2]["content_list_name"] == "contentList 4"
    assert repost_feed[3]["title"] == "digital_content 4"
    # Should skip digital_content 1 because it is deleted
    assert repost_feed[4]["title"] == "digital_content 3"
