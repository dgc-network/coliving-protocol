import logging

from integration_tests.utils import populate_mock_db
from src.queries import response_name_constants
from src.queries.get_top_users import _get_top_users
from src.queries.query_helpers import populate_user_metadata
from src.utils.db_session import get_db

logger = logging.getLogger(__name__)


def test_populate_user_metadata(app):
    """Tests that populate_user_metadata works after aggregate_user update"""
    with app.app_context():
        db = get_db()

    test_entities = {
        "agreements": [
            {"agreement_id": 1, "owner_id": 1},
            {"agreement_id": 2, "owner_id": 1},
            {"agreement_id": 3, "owner_id": 2},
            {"agreement_id": 4, "owner_id": 2},
            {"agreement_id": 5, "owner_id": 2},
            {"agreement_id": 6, "owner_id": 2},
            {"agreement_id": 7, "owner_id": 3},
            {"agreement_id": 8, "owner_id": 3},
            {"agreement_id": 9, "is_unlisted": True, "owner_id": 3},
        ],
        "contentLists": [
            {"contentList_id": 1, "contentList_owner_id": 1},
            {"contentList_id": 2, "contentList_owner_id": 1},
            {"contentList_id": 3, "is_album": True, "contentList_owner_id": 1},
            {"contentList_id": 4, "contentList_owner_id": 2},
            {"contentList_id": 5, "is_delete": True, "contentList_owner_id": 2},
            {"contentList_id": 6, "is_album": True, "contentList_owner_id": 3},
            {"contentList_id": 6, "is_private": True, "contentList_owner_id": 3},
        ],
        "users": [
            {"user_id": 1, "handle": "user1", "wallet": "0x111"},
            {"user_id": 2, "handle": "user2", "wallet": "0x222"},
            {"user_id": 3, "handle": "user3", "wallet": "0x333"},
            {"user_id": 4, "handle": "user4", "wallet": "0x444"},
        ],
        "follows": [
            {"follower_user_id": 1, "followee_user_id": 2},
            {"follower_user_id": 1, "followee_user_id": 3},
            {"follower_user_id": 2, "followee_user_id": 3},
        ],
        "reposts": [
            {"repost_item_id": 1, "repost_type": "agreement", "user_id": 2},
            {"repost_item_id": 1, "repost_type": "contentList", "user_id": 2},
            {"repost_item_id": 1, "repost_type": "agreement", "user_id": 3},
            {"repost_item_id": 1, "repost_type": "contentList", "user_id": 3},
            {"repost_item_id": 4, "repost_type": "agreement", "user_id": 1},
            {"repost_item_id": 5, "repost_type": "agreement", "user_id": 1},
            {"repost_item_id": 6, "repost_type": "agreement", "user_id": 1},
        ],
        "saves": [
            {"save_item_id": 1, "save_type": "agreement", "user_id": 2},
            {"save_item_id": 1, "save_type": "contentList", "user_id": 2},
            {"save_item_id": 1, "save_type": "agreement", "user_id": 3},
            {"save_item_id": 1, "save_type": "contentList", "user_id": 3},
            {"save_item_id": 4, "save_type": "agreement", "user_id": 1},
            {"save_item_id": 5, "save_type": "agreement", "user_id": 1},
            {"save_item_id": 6, "save_type": "agreement", "user_id": 1},
        ],
    }

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        user_ids = [1, 2, 3, 4, 5]
        users = [
            {"user_id": 1, "wallet": "0x111", "is_verified": False},
            {"user_id": 2, "wallet": "0x222", "is_verified": False},
            {"user_id": 3, "wallet": "0x333", "is_verified": False},
            {"user_id": 4, "wallet": "0x444", "is_verified": False},
            {"user_id": 5, "wallet": "0x555", "is_verified": False},
        ]

        users = populate_user_metadata(session, user_ids, users, 3)
        assert len(users) == 5

        assert users[0]["does_follow_current_user"] == True
        assert users[1]["does_follow_current_user"] == True
        assert users[2]["does_follow_current_user"] == False
        assert users[3]["does_follow_current_user"] == False
        assert users[4]["does_follow_current_user"] == False

        assert users[0]["user_id"] == 1
        assert users[0][response_name_constants.agreement_count] == 2
        assert users[0][response_name_constants.contentList_count] == 2
        assert users[0][response_name_constants.album_count] == 1
        assert users[0][response_name_constants.follower_count] == 0
        assert users[0][response_name_constants.followee_count] == 2
        assert users[0][response_name_constants.repost_count] == 3

        assert users[1]["user_id"] == 2
        assert users[1][response_name_constants.agreement_count] == 4
        assert users[1][response_name_constants.contentList_count] == 1
        assert users[1][response_name_constants.album_count] == 0
        assert users[1][response_name_constants.follower_count] == 1
        assert users[1][response_name_constants.followee_count] == 1
        assert users[1][response_name_constants.repost_count] == 2

        assert users[2]["user_id"] == 3
        assert users[2][response_name_constants.agreement_count] == 2
        assert users[2][response_name_constants.contentList_count] == 0
        assert users[2][response_name_constants.album_count] == 1
        assert users[2][response_name_constants.follower_count] == 2
        assert users[2][response_name_constants.followee_count] == 0
        assert users[2][response_name_constants.repost_count] == 2

        assert users[3]["user_id"] == 4
        assert users[3][response_name_constants.agreement_count] == 0
        assert users[3][response_name_constants.contentList_count] == 0
        assert users[3][response_name_constants.album_count] == 0
        assert users[3][response_name_constants.follower_count] == 0
        assert users[3][response_name_constants.followee_count] == 0
        assert users[3][response_name_constants.repost_count] == 0

        assert users[4]["user_id"] == 5
        assert users[4][response_name_constants.agreement_count] == 0
        assert users[4][response_name_constants.contentList_count] == 0
        assert users[4][response_name_constants.album_count] == 0
        assert users[4][response_name_constants.follower_count] == 0
        assert users[4][response_name_constants.followee_count] == 0
        assert users[4][response_name_constants.repost_count] == 0

        curr_user_ids = [1, 2, 3]
        curr_users = [
            {"user_id": 1, "wallet": "0x111", "is_verified": False},
            {"user_id": 2, "wallet": "0x222", "is_verified": False},
            {"user_id": 3, "wallet": "0x333", "is_verified": False},
        ]

        users = populate_user_metadata(session, curr_user_ids, curr_users, 1)
        assert len(users) == 3

        assert users[0]["user_id"] == 1
        assert users[0][response_name_constants.does_current_user_follow] == False
        assert users[0][response_name_constants.current_user_followee_follow_count] == 0
        assert users[0][response_name_constants.balance] == "0"
        assert users[0][response_name_constants.associated_wallets_balance] == "0"

        assert users[1]["user_id"] == 2
        assert users[1][response_name_constants.does_current_user_follow] == True
        assert users[1][response_name_constants.current_user_followee_follow_count] == 0
        assert users[1][response_name_constants.balance] == "0"
        assert users[1][response_name_constants.associated_wallets_balance] == "0"

        assert users[2]["user_id"] == 3
        assert users[2][response_name_constants.does_current_user_follow] == True
        assert users[2][response_name_constants.current_user_followee_follow_count] == 1
        assert users[2][response_name_constants.balance] == "0"
        assert users[2][response_name_constants.associated_wallets_balance] == "0"

        # get_top_users: should return only artists, most followers first
        top_user_ids = [u["user_id"] for u in _get_top_users(session, 1, 100, 0)]
        assert top_user_ids == [3, 2, 1]
