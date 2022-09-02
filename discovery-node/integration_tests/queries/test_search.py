import os
import subprocess
from datetime import datetime

import pytest
from src.models.indexing.block import Block
from src.models.content_lists.content_list import ContentList
from src.models.social.follow import Follow
from src.models.social.save import Save, SaveType
from src.models.agreements.agreement import Agreement
from src.models.users.user import User
from src.models.users.user_balance import UserBalance
from src.queries.search_es import search_es_full
from src.queries.search_queries import (
    content_list_search_query,
    agreement_search_query,
    user_search_query,
)
from src.utils.db_session import get_db


@pytest.fixture(autouse=True, scope="module")
def setup_search(app_module):
    with app_module.app_context():
        db = get_db()

    # Import app so that it'll run migrations against the db
    now = datetime.now()
    blocks = [
        Block(
            blockhash=hex(1),
            number=1,
            parenthash="0x01",
            is_current=False,
        ),
        Block(
            blockhash=hex(2),
            number=2,
            parenthash="0x02",
            is_current=False,
        ),
        Block(
            blockhash=hex(3),
            number=3,
            parenthash="0x03",
            is_current=True,
        ),
    ]
    agreements = [
        Agreement(
            blockhash=hex(1),
            blocknumber=1,
            agreement_id=1,
            is_current=True,
            is_delete=False,
            owner_id=1,
            route_id="",
            agreement_segments=[],
            genre="",
            updated_at=now,
            created_at=now,
            is_unlisted=False,
            title="the agreement 1",
            download={"cid": None, "is_downloadable": False, "requires_follow": False},
        ),
        Agreement(
            blockhash=hex(2),
            blocknumber=2,
            agreement_id=2,
            is_current=True,
            is_delete=False,
            owner_id=2,
            route_id="",
            agreement_segments=[],
            genre="",
            updated_at=now,
            created_at=now,
            is_unlisted=False,
            title="the agreement 2",
            download={"cid": None, "is_downloadable": True, "requires_follow": False},
        ),
        Agreement(
            blockhash=hex(3),
            blocknumber=3,
            agreement_id=3,
            is_current=True,
            is_delete=False,
            owner_id=1,
            route_id="",
            agreement_segments=[],
            genre="",
            updated_at=now,
            created_at=now,
            is_unlisted=False,
            title="xyz",
            download={"cid": None, "is_downloadable": True, "requires_follow": False},
        ),
    ]

    # need users for the lexeme dict to work
    users = [
        User(
            blockhash=hex(1),
            blocknumber=1,
            user_id=1,
            is_current=True,
            handle="",
            wallet="",
            name="user 1",
            updated_at=now,
            created_at=now,
        ),
        User(
            blockhash=hex(2),
            blocknumber=2,
            user_id=2,
            is_current=True,
            handle="",
            name="user 2",
            wallet="",
            updated_at=now,
            created_at=now,
        ),
        User(
            blockhash=hex(3),
            blocknumber=3,
            user_id=3,
            is_current=True,
            handle="",
            wallet="",
            name="fdwea",
            updated_at=now,
            created_at=now,
        ),
    ]

    follows = [
        Follow(
            blockhash=hex(1),
            blocknumber=1,
            follower_user_id=2,
            followee_user_id=1,
            is_current=True,
            is_delete=False,
            created_at=now,
        )
    ]

    contentLists = [
        ContentList(
            blockhash=hex(1),
            blocknumber=1,
            content_list_id=1,
            content_list_owner_id=1,
            is_album=False,
            is_private=False,
            content_list_name="contentList 1",
            content_list_contents={"agreement_ids": [{"agreement": 1, "time": 1}]},
            is_current=True,
            is_delete=False,
            updated_at=now,
            created_at=now,
        ),
        ContentList(
            blockhash=hex(2),
            blocknumber=2,
            content_list_id=2,
            content_list_owner_id=2,
            is_album=True,
            is_private=False,
            content_list_name="album 1",
            content_list_contents={"agreement_ids": [{"agreement": 2, "time": 2}]},
            is_current=True,
            is_delete=False,
            updated_at=now,
            created_at=now,
        ),
    ]

    saves = [
        Save(
            blockhash=hex(1),
            blocknumber=1,
            user_id=1,
            save_item_id=1,
            save_type=SaveType.agreement,
            created_at=now,
            is_current=True,
            is_delete=False,
        ),
        Save(
            blockhash=hex(1),
            blocknumber=1,
            user_id=1,
            save_item_id=1,
            save_type=SaveType.contentList,
            created_at=now,
            is_current=True,
            is_delete=False,
        ),
        Save(
            blockhash=hex(1),
            blocknumber=1,
            user_id=1,
            save_item_id=2,
            save_type=SaveType.album,
            created_at=now,
            is_current=True,
            is_delete=False,
        ),
    ]

    balances = [
        UserBalance(
            user_id=1,
            balance=0,
            associated_wallets_balance=0,
            associated_sol_wallets_balance=0,
            wlive=0,
        )
    ]

    with db.scoped_session() as session:
        for block in blocks:
            session.add(block)
            session.flush()
        for agreement in agreements:
            session.add(agreement)
        for user in users:
            session.add(user)
            session.flush()
        for follow in follows:
            session.add(follow)
            session.flush()
        for contentList in contentLists:
            session.add(contentList)
            session.flush()
        for save in saves:
            session.add(save)
            session.flush()
        for balance in balances:
            session.add(balance)
            session.flush()

        # Refresh the lexeme matview
        session.execute("REFRESH MATERIALIZED VIEW agreement_lexeme_dict;")
        session.execute("REFRESH MATERIALIZED VIEW user_lexeme_dict;")

        session.execute("REFRESH MATERIALIZED VIEW content_list_lexeme_dict;")
        session.execute("REFRESH MATERIALIZED VIEW album_lexeme_dict;")

    subprocess.run(
        ["npm", "run", "catchup:ci"],
        env=os.environ,
        capture_output=True,
        text=True,
        cwd="es-indexer",
        timeout=5,
    )


def test_get_agreements_external(app_module):
    """Tests we get all agreements, including downloaded"""
    with app_module.app_context():
        db = get_db()

    with db.scoped_session() as session:
        res = agreement_search_query(session, "the agreement", 10, 0, False, None, False)
        assert len(res["all"]) == 2
        assert len(res["saved"]) == 0

    search_args = {
        "is_auto_complete": False,
        "kind": "agreements",
        "query": "the agreement",
        "current_user_id": None,
        "with_users": True,
        "limit": 10,
        "offset": 0,
        "only_downloadable": False,
    }
    es_res = search_es_full(search_args)

    assert len(es_res["agreements"]) == 2


def test_get_autocomplete_agreements(app_module):
    """Tests we get all agreements with autocomplete"""
    with app_module.app_context():
        db = get_db()

    with db.scoped_session() as session:
        res = agreement_search_query(session, "the agreement", 10, 0, True, None, False)
        assert len(res["all"]) == 2
        assert len(res["saved"]) == 0

    search_args = {
        "is_auto_complete": True,
        "kind": "agreements",
        "query": "the agreement",
        "current_user_id": None,
        "with_users": True,
        "limit": 10,
        "offset": 0,
        "only_downloadable": False,
    }
    es_res = search_es_full(search_args)

    assert len(es_res["agreements"]) == 2


def test_get_agreements_internal(app_module):
    """Tests we get all agreements when a user is logged in"""
    with app_module.app_context():
        db = get_db()

    with db.scoped_session() as session:
        res = agreement_search_query(session, "the agreement", 10, 0, False, 1, False)
        assert len(res["all"]) == 2
        assert len(res["saved"]) == 1

    search_args = {
        "is_auto_complete": False,
        "kind": "agreements",
        "query": "the agreement",
        "current_user_id": 1,
        "with_users": True,
        "limit": 10,
        "offset": 0,
        "only_downloadable": False,
    }
    es_res = search_es_full(search_args)

    assert len(es_res["agreements"]) == 2
    assert len(es_res["saved_agreements"]) == 1


def test_get_downloadable_agreements(app_module):
    """Tests we get only downloadable results"""
    with app_module.app_context():
        db = get_db()

    with db.scoped_session() as session:
        res = agreement_search_query(session, "the agreement", 10, 0, False, None, True)
        assert len(res["all"]) == 1
        assert len(res["saved"]) == 0

    search_args = {
        "is_auto_complete": False,
        "kind": "agreements",
        "query": "the agreement",
        "current_user_id": None,
        "with_users": True,
        "limit": 10,
        "offset": 0,
        "only_downloadable": True,
    }
    es_res = search_es_full(search_args)

    assert len(es_res["agreements"]) == 1
    assert len(es_res["saved_agreements"]) == 0


def test_get_external_users(app_module):
    """Tests we get all users"""
    with app_module.app_context():
        db = get_db()

    with db.scoped_session() as session:
        res = user_search_query(session, "user", 10, 0, False, None)
        assert len(res["all"]) == 2
        assert len(res["followed"]) == 0

    search_args = {
        "is_auto_complete": False,
        "kind": "users",
        "query": "user",
        "current_user_id": None,
        "with_users": True,
        "limit": 10,
        "offset": 0,
        "only_downloadable": False,
    }
    es_res = search_es_full(search_args)

    assert len(es_res["users"]) == 2
    assert len(es_res["followed_users"]) == 0


def test_get_autocomplete_users(app_module):
    """Tests we get all users with autocomplete"""
    with app_module.app_context():
        db = get_db()

    with db.scoped_session() as session:
        res = user_search_query(session, "user", 10, 0, True, None)
        assert len(res["all"]) == 2
        assert len(res["followed"]) == 0

    search_args = {
        "is_auto_complete": True,
        "kind": "users",
        "query": "user",
        "current_user_id": None,
        "with_users": True,
        "limit": 10,
        "offset": 0,
        "only_downloadable": False,
    }
    es_res = search_es_full(search_args)

    assert len(es_res["users"]) == 2
    assert len(es_res["followed_users"]) == 0


def test_get_internal_users(app_module):
    """Tests we get all users when a user is logged in"""
    with app_module.app_context():
        db = get_db()

    with db.scoped_session() as session:
        res = user_search_query(session, "user", 10, 0, False, 2)
        assert len(res["all"]) == 2
        assert len(res["followed"]) == 1

    search_args = {
        "is_auto_complete": False,
        "kind": "users",
        "query": "user",
        "current_user_id": 2,
        "with_users": True,
        "limit": 10,
        "offset": 0,
        "only_downloadable": False,
    }
    es_res = search_es_full(search_args)

    assert len(es_res["users"]) == 2
    assert len(es_res["followed_users"]) == 1


def test_get_internal_users_no_following(app_module):
    """Tests we get all users for a user that doesn't follow anyone"""
    with app_module.app_context():
        db = get_db()

    with db.scoped_session() as session:
        res = user_search_query(session, "user", 10, 0, False, 1)
        assert len(res["all"]) == 2
        assert len(res["followed"]) == 0

    search_args = {
        "is_auto_complete": False,
        "kind": "users",
        "query": "user",
        "current_user_id": 1,
        "with_users": True,
        "limit": 10,
        "offset": 0,
        "only_downloadable": False,
    }
    es_res = search_es_full(search_args)
    assert len(es_res["users"]) == 2
    assert len(es_res["followed_users"]) == 0


def test_get_external_content_lists(app_module):
    """Tests we get all content lists"""
    with app_module.app_context():
        db = get_db()

    with db.scoped_session() as session:
        res = content_list_search_query(session, "content_list", 10, 0, False, False, None)
        assert len(res["all"]) == 1
        assert len(res["saved"]) == 0

    search_args = {
        "is_auto_complete": False,
        "kind": "content_lists",
        "query": "content_list",
        "current_user_id": None,
        "with_users": True,
        "limit": 10,
        "offset": 0,
        "only_downloadable": False,
    }
    es_res = search_es_full(search_args)
    assert len(es_res["content_lists"]) == 1
    assert len(es_res["saved_content_lists"]) == 0


def test_get_autocomplete_content_lists(app_module):
    """Tests we get all agreements with autocomplete"""
    with app_module.app_context():
        db = get_db()

    with db.scoped_session() as session:
        res = content_list_search_query(session, "content_list", 10, 0, False, True, None)
        assert len(res["all"]) == 1
        assert len(res["saved"]) == 0

    search_args = {
        "is_auto_complete": True,
        "kind": "content_lists",
        "query": "content_list",
        "current_user_id": None,
        "with_users": True,
        "limit": 10,
        "offset": 0,
        "only_downloadable": False,
    }
    es_res = search_es_full(search_args)
    assert len(es_res["content_lists"]) == 1
    assert len(es_res["saved_content_lists"]) == 0


def test_get_internal_content_lists(app_module):
    """Tests we get contentLists when a user is logged in"""
    with app_module.app_context():
        db = get_db()

    with db.scoped_session() as session:
        res = content_list_search_query(session, "content_list", 10, 0, False, False, 1)
        assert len(res["all"]) == 1
        assert len(res["saved"]) == 1

    search_args = {
        "is_auto_complete": False,
        "kind": "content_lists",
        "query": "content_list",
        "current_user_id": 1,
        "with_users": True,
        "limit": 10,
        "offset": 0,
        "only_downloadable": False,
    }
    es_res = search_es_full(search_args)
    assert len(es_res["content_lists"]) == 1
    assert len(es_res["saved_content_lists"]) == 1


def test_get_external_albums(app_module):
    """Tests we get all albums"""
    with app_module.app_context():
        db = get_db()

    with db.scoped_session() as session:
        res = content_list_search_query(session, "album", 10, 0, True, False, None)
        assert len(res["all"]) == 1
        assert len(res["saved"]) == 0

    search_args = {
        "is_auto_complete": False,
        "kind": "albums",
        "query": "album",
        "current_user_id": None,
        "with_users": True,
        "limit": 10,
        "offset": 0,
        "only_downloadable": False,
    }
    es_res = search_es_full(search_args)
    assert len(es_res["albums"]) == 1
    assert len(es_res["saved_albums"]) == 0


def test_get_autocomplete_albums(app_module):
    """Tests we get all albums with autocomplete"""
    with app_module.app_context():
        db = get_db()

    with db.scoped_session() as session:
        res = content_list_search_query(session, "album", 10, 0, True, True, None)
        assert len(res["all"]) == 1
        assert len(res["saved"]) == 0

    search_args = {
        "is_auto_complete": True,
        "kind": "albums",
        "query": "album",
        "current_user_id": None,
        "with_users": True,
        "limit": 10,
        "offset": 0,
        "only_downloadable": False,
    }
    es_res = search_es_full(search_args)
    assert len(es_res["albums"]) == 1
    assert len(es_res["saved_albums"]) == 0


def test_get_internal_albums(app_module):
    """Tests we get albums when a user is logged in"""
    with app_module.app_context():
        db = get_db()

    with db.scoped_session() as session:
        res = content_list_search_query(session, "album", 10, 0, True, False, 1)
        assert len(res["all"]) == 1
        assert len(res["saved"]) == 1

    search_args = {
        "is_auto_complete": True,
        "kind": "albums",
        "query": "album",
        "current_user_id": 1,
        "with_users": True,
        "limit": 10,
        "offset": 0,
        "only_downloadable": False,
    }
    es_res = search_es_full(search_args)
    assert len(es_res["albums"]) == 1
    assert len(es_res["saved_albums"]) == 1
