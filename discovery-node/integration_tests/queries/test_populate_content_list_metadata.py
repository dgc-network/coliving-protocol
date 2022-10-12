import logging

from integration_tests.utils import populate_mock_db
from src.models.social.repost import RepostType
from src.models.social.save import SaveType
from src.queries import response_name_constants
from src.queries.query_helpers import populate_content_list_metadata
from src.utils.db_session import get_db

logger = logging.getLogger(__name__)


def test_populate_content_list_metadata(app):
    """Tests that populate_content_list_metadata works after aggregate_user update"""
    with app.app_context():
        db = get_db()

    test_entities = {
        "content_lists": [
            {"content_list_id": 1, "content_list_owner_id": 1},
            {"content_list_id": 2, "content_list_owner_id": 1},
            {"content_list_id": 3, "content_list_owner_id": 2},
            {"content_list_id": 4, "content_list_owner_id": 3},
        ],
        "users": [
            {"user_id": 1, "handle": "user1"},
            {"user_id": 2, "handle": "user2"},
            {"user_id": 3, "handle": "user3"},
            {"user_id": 4, "handle": "user4"},
        ],
        "reposts": [
            {"repost_item_id": 1, "repost_type": "content_list", "user_id": 2},
            {"repost_item_id": 1, "repost_type": "content_list", "user_id": 3},
            {"repost_item_id": 2, "repost_type": "content_list", "user_id": 1},
        ],
        "saves": [
            {"save_item_id": 1, "save_type": "content_list", "user_id": 2},
            {"save_item_id": 1, "save_type": "content_list", "user_id": 3},
            {"save_item_id": 3, "save_type": "content_list", "user_id": 2},
            {"save_item_id": 3, "save_type": "content_list", "user_id": 1},
        ],
        "follows": [
            {"follower_user_id": 1, "followee_user_id": 2},
            {"follower_user_id": 1, "followee_user_id": 3},
        ],
    }

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        content_list_ids = [1, 2, 3, 4]
        contentLists = [
            {"content_list_id": 1, "content_list_contents": {"digital_content_ids": []}},
            {"content_list_id": 2, "content_list_contents": {"digital_content_ids": []}},
            {"content_list_id": 3, "content_list_contents": {"digital_content_ids": []}},
            {"content_list_id": 4, "content_list_contents": {"digital_content_ids": []}},
        ]

        contentLists = populate_content_list_metadata(
            session,
            content_list_ids,
            contentLists,
            [RepostType.contentList, RepostType.album],
            [SaveType.contentList, SaveType.album],
            None,
        )
        assert len(contentLists) == 4
        assert contentLists[0]["content_list_id"] == 1
        assert contentLists[0][response_name_constants.repost_count] == 2
        assert contentLists[0][response_name_constants.save_count] == 2
        assert contentLists[0][response_name_constants.total_play_count] == 0

        assert contentLists[1]["content_list_id"] == 2
        assert contentLists[1][response_name_constants.repost_count] == 1
        assert contentLists[1][response_name_constants.save_count] == 0
        assert contentLists[1][response_name_constants.total_play_count] == 0

        assert contentLists[2]["content_list_id"] == 3
        assert contentLists[2][response_name_constants.repost_count] == 0
        assert contentLists[2][response_name_constants.save_count] == 2
        assert contentLists[2][response_name_constants.total_play_count] == 0

        curr_content_list_ids = [1, 2, 3]
        curr_content_lists = [
            {"content_list_id": 1, "content_list_contents": {"digital_content_ids": []}},
            {"content_list_id": 2, "content_list_contents": {"digital_content_ids": []}},
            {"content_list_id": 3, "content_list_contents": {"digital_content_ids": []}},
        ]

        contentLists = populate_content_list_metadata(
            session,
            curr_content_list_ids,
            curr_content_lists,
            [RepostType.contentList, RepostType.album],
            [SaveType.contentList, SaveType.album],
            1,
        )
        assert len(contentLists) == 3

        assert contentLists[0]["content_list_id"] == 1
        repost_user_ids = [
            repost["user_id"]
            for repost in contentLists[0][response_name_constants.followee_reposts]
        ]
        repost_user_ids.sort()
        assert repost_user_ids == [2, 3]
        save_user_ids = [
            save["user_id"]
            for save in contentLists[0][response_name_constants.followee_saves]
        ]
        save_user_ids.sort()
        assert save_user_ids == [2, 3]
        assert contentLists[0][response_name_constants.has_current_user_reposted] == False
        assert contentLists[0][response_name_constants.has_current_user_saved] == False

        assert contentLists[1]["content_list_id"] == 2
        assert contentLists[1][response_name_constants.followee_reposts] == []
        assert contentLists[1][response_name_constants.followee_saves] == []
        assert contentLists[1][response_name_constants.has_current_user_reposted] == True
        assert contentLists[1][response_name_constants.has_current_user_saved] == False

        assert contentLists[2]["content_list_id"] == 3
        assert contentLists[2][response_name_constants.followee_reposts] == []
        save_user_ids = [
            save["user_id"]
            for save in contentLists[2][response_name_constants.followee_saves]
        ]
        save_user_ids.sort()
        assert save_user_ids == [2]
        assert contentLists[2][response_name_constants.has_current_user_reposted] == False
        assert contentLists[2][response_name_constants.has_current_user_saved] == True
