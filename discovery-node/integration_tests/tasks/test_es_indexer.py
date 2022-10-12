import logging
import os
import subprocess

from elasticsearch import Elasticsearch
from integration_tests.utils import populate_mock_db
from src.utils.db_session import get_db

logger = logging.getLogger(__name__)

esclient = Elasticsearch(os.environ["coliving_elasticsearch_url"])

basic_entities = {
    "users": [
        {"user_id": 1, "handle": "user1"},
        {"user_id": 2, "handle": "user2"},
    ],
    "digitalContents": [
        {"digital_content_id": 1, "owner_id": 1},
    ],
    "content_lists": [
        {
            "content_list_id": 1,
            "content_list_owner_id": 1,
            "content_list_contents": {
                "digital_content_ids": [
                    {"digital_content": 1, "time": 1},
                ]
            },
        },
    ],
    "follows": [
        {
            "follower_user_id": 1,
            "followee_user_id": 2,
        }
    ],
    "reposts": [
        {"repost_item_id": 1, "repost_type": "digital_content", "user_id": 2},
    ],
    "saves": [
        {"save_item_id": 1, "save_type": "digital_content", "user_id": 2},
    ],
}


def test_es_indexer_catchup(app):
    """
    Tests initial catchup.
    """

    with app.app_context():
        db = get_db()

    populate_mock_db(db, basic_entities)

    # run indexer catchup
    subprocess.run(
        ["npm", "run", "catchup:ci"],
        env=os.environ,
        capture_output=True,
        text=True,
        cwd="es-indexer",
        timeout=5,
    )
    esclient.indices.refresh(index="*")
    search_res = esclient.search(index="*", query={"match_all": {}})["hits"]["hits"]
    assert len(search_res) == 6
