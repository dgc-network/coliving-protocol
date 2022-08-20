import logging

from integration_tests.utils import populate_mock_db
from src.models.social.repost import RepostType
from src.models.social.save import SaveType
from src.queries import response_name_constants
from src.queries.query_helpers import populate_content list_metadata
from src.utils.db_session import get_db

logger = logging.getLogger(__name__)


def test_populate_content list_metadata(app):
    """Tests that populate_content list_metadata works after aggregate_user update"""
    with app.app_context():
        db = get_db()

    test_entities = {
        "content lists": [
            {"content list_id": 1, "content list_owner_id": 1},
            {"content list_id": 2, "content list_owner_id": 1},
            {"content list_id": 3, "content list_owner_id": 2},
            {"content list_id": 4, "content list_owner_id": 3},
        ],
        "users": [
            {"user_id": 1, "handle": "user1"},
            {"user_id": 2, "handle": "user2"},
            {"user_id": 3, "handle": "user3"},
            {"user_id": 4, "handle": "user4"},
        ],
        "reposts": [
            {"repost_item_id": 1, "repost_type": "content list", "user_id": 2},
            {"repost_item_id": 1, "repost_type": "content list", "user_id": 3},
            {"repost_item_id": 2, "repost_type": "content list", "user_id": 1},
        ],
        "saves": [
            {"save_item_id": 1, "save_type": "content list", "user_id": 2},
            {"save_item_id": 1, "save_type": "content list", "user_id": 3},
            {"save_item_id": 3, "save_type": "content list", "user_id": 2},
            {"save_item_id": 3, "save_type": "content list", "user_id": 1},
        ],
        "follows": [
            {"follower_user_id": 1, "followee_user_id": 2},
            {"follower_user_id": 1, "followee_user_id": 3},
        ],
    }

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        content list_ids = [1, 2, 3, 4]
        content lists = [
            {"content list_id": 1, "content list_contents": {"agreement_ids": []}},
            {"content list_id": 2, "content list_contents": {"agreement_ids": []}},
            {"content list_id": 3, "content list_contents": {"agreement_ids": []}},
            {"content list_id": 4, "content list_contents": {"agreement_ids": []}},
        ]

        content lists = populate_content list_metadata(
            session,
            content list_ids,
            content lists,
            [RepostType.content list, RepostType.album],
            [SaveType.content list, SaveType.album],
            None,
        )
        assert len(content lists) == 4
        assert content lists[0]["content list_id"] == 1
        assert content lists[0][response_name_constants.repost_count] == 2
        assert content lists[0][response_name_constants.save_count] == 2
        assert content lists[0][response_name_constants.total_play_count] == 0

        assert content lists[1]["content list_id"] == 2
        assert content lists[1][response_name_constants.repost_count] == 1
        assert content lists[1][response_name_constants.save_count] == 0
        assert content lists[1][response_name_constants.total_play_count] == 0

        assert content lists[2]["content list_id"] == 3
        assert content lists[2][response_name_constants.repost_count] == 0
        assert content lists[2][response_name_constants.save_count] == 2
        assert content lists[2][response_name_constants.total_play_count] == 0

        curr_content list_ids = [1, 2, 3]
        curr_content lists = [
            {"content list_id": 1, "content list_contents": {"agreement_ids": []}},
            {"content list_id": 2, "content list_contents": {"agreement_ids": []}},
            {"content list_id": 3, "content list_contents": {"agreement_ids": []}},
        ]

        content lists = populate_content list_metadata(
            session,
            curr_content list_ids,
            curr_content lists,
            [RepostType.content list, RepostType.album],
            [SaveType.content list, SaveType.album],
            1,
        )
        assert len(content lists) == 3

        assert content lists[0]["content list_id"] == 1
        repost_user_ids = [
            repost["user_id"]
            for repost in content lists[0][response_name_constants.followee_reposts]
        ]
        repost_user_ids.sort()
        assert repost_user_ids == [2, 3]
        save_user_ids = [
            save["user_id"]
            for save in content lists[0][response_name_constants.followee_saves]
        ]
        save_user_ids.sort()
        assert save_user_ids == [2, 3]
        assert content lists[0][response_name_constants.has_current_user_reposted] == False
        assert content lists[0][response_name_constants.has_current_user_saved] == False

        assert content lists[1]["content list_id"] == 2
        assert content lists[1][response_name_constants.followee_reposts] == []
        assert content lists[1][response_name_constants.followee_saves] == []
        assert content lists[1][response_name_constants.has_current_user_reposted] == True
        assert content lists[1][response_name_constants.has_current_user_saved] == False

        assert content lists[2]["content list_id"] == 3
        assert content lists[2][response_name_constants.followee_reposts] == []
        save_user_ids = [
            save["user_id"]
            for save in content lists[2][response_name_constants.followee_saves]
        ]
        save_user_ids.sort()
        assert save_user_ids == [2]
        assert content lists[2][response_name_constants.has_current_user_reposted] == False
        assert content lists[2][response_name_constants.has_current_user_saved] == True
