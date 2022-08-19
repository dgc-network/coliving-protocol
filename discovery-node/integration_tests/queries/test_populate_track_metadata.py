import logging

from integration_tests.utils import populate_mock_db
from src.queries import response_name_constants
from src.queries.query_helpers import populate_agreement_metadata
from src.utils.db_session import get_db

logger = logging.getLogger(__name__)


def test_populate_agreement_metadata(app):
    """Tests that populate_agreement_metadata works after aggregate_user update"""
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
            {"agreement_id": 9, "owner_id": 3},
            {"agreement_id": 10, "is_unlisted": True, "owner_id": 3},
        ],
        "users": [
            {"user_id": 1, "handle": "user1"},
            {"user_id": 2, "handle": "user2"},
            {"user_id": 3, "handle": "user3"},
            {"user_id": 4, "handle": "user4"},
        ],
        "reposts": [
            {"repost_item_id": 1, "repost_type": "agreement", "user_id": 2},
            {"repost_item_id": 1, "repost_type": "agreement", "user_id": 3},
            {"repost_item_id": 2, "repost_type": "agreement", "user_id": 1},
        ],
        "saves": [
            {"save_item_id": 1, "save_type": "agreement", "user_id": 2},
            {"save_item_id": 1, "save_type": "agreement", "user_id": 3},
            {"save_item_id": 3, "save_type": "agreement", "user_id": 2},
            {"save_item_id": 3, "save_type": "agreement", "user_id": 1},
        ],
        "follows": [
            {"follower_user_id": 1, "followee_user_id": 2},
            {"follower_user_id": 1, "followee_user_id": 3},
        ],
    }

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        agreement_ids = [1, 2, 3]
        agreements = [
            {"agreement_id": 1},
            {"agreement_id": 2},
            {"agreement_id": 3},
        ]

        agreements = populate_agreement_metadata(session, agreement_ids, agreements, None)
        assert len(agreements) == 3

        assert agreements[0]["agreement_id"] == 1
        assert agreements[0][response_name_constants.repost_count] == 2
        assert agreements[0][response_name_constants.save_count] == 2
        assert agreements[0][response_name_constants.play_count] == 0

        assert agreements[1]["agreement_id"] == 2
        assert agreements[1][response_name_constants.repost_count] == 1
        assert agreements[1][response_name_constants.save_count] == 0
        assert agreements[1][response_name_constants.play_count] == 0

        assert agreements[2]["agreement_id"] == 3
        assert agreements[2][response_name_constants.repost_count] == 0
        assert agreements[2][response_name_constants.save_count] == 2
        assert agreements[2][response_name_constants.play_count] == 0

        curr_agreement_ids = [1, 2, 3]
        curr_agreements = [{"agreement_id": 1}, {"agreement_id": 2}, {"agreement_id": 3}]

        agreements = populate_agreement_metadata(session, curr_agreement_ids, curr_agreements, 1)
        assert len(agreements) == 3

        assert agreements[0]["agreement_id"] == 1
        repost_user_ids = [
            repost["user_id"]
            for repost in agreements[0][response_name_constants.followee_reposts]
        ]
        repost_user_ids.sort()
        assert repost_user_ids == [2, 3]
        save_user_ids = [
            save["user_id"]
            for save in agreements[0][response_name_constants.followee_saves]
        ]
        save_user_ids.sort()
        assert save_user_ids == [2, 3]
        assert agreements[0][response_name_constants.has_current_user_reposted] == False
        assert agreements[0][response_name_constants.has_current_user_saved] == False

        assert agreements[1]["agreement_id"] == 2
        assert agreements[1][response_name_constants.followee_reposts] == []
        assert agreements[1][response_name_constants.followee_saves] == []
        assert agreements[1][response_name_constants.has_current_user_reposted] == True
        assert agreements[1][response_name_constants.has_current_user_saved] == False

        assert agreements[2]["agreement_id"] == 3
        assert agreements[2][response_name_constants.followee_reposts] == []
        save_user_ids = [
            save["user_id"]
            for save in agreements[2][response_name_constants.followee_saves]
        ]
        save_user_ids.sort()
        assert save_user_ids == [2]
        assert agreements[2][response_name_constants.has_current_user_reposted] == False
        assert agreements[2][response_name_constants.has_current_user_saved] == True
