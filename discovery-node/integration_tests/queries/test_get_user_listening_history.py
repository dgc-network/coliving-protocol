from datetime import datetime, timedelta

from integration_tests.utils import populate_mock_db
from src.queries import response_name_constants
from src.queries.get_user_listening_history import (
    GetUserListeningHistoryArgs,
    _get_user_listening_history,
)
from src.tasks.user_listening_history.index_user_listening_history import (
    _index_user_listening_history,
)
from src.utils.db_session import get_db

TIMESTAMP = datetime(2011, 1, 1)

test_entities = {
    "plays": [
        {"user_id": 1, "item_id": 1, "created_at": TIMESTAMP + timedelta(minutes=1)},
        {"user_id": 1, "item_id": 2, "created_at": TIMESTAMP + timedelta(minutes=3)},
        {
            "user_id": 1,
            "item_id": 1,
            "created_at": TIMESTAMP + timedelta(minutes=2),
        },  # duplicate play
        {"user_id": 1, "item_id": 3, "created_at": TIMESTAMP + timedelta(minutes=4)},
        {"user_id": 2, "item_id": 2, "created_at": TIMESTAMP},
    ],
    "agreements": [
        {"agreement_id": 1, "title": "agreement 1", "owner_id": 1, "is_delete": True},
        {"agreement_id": 2, "title": "agreement 2", "owner_id": 2},
        {"agreement_id": 3, "title": "agreement 3", "owner_id": 3},
    ],
    "users": [
        {"user_id": 1, "handle": "user-1"},
        {"user_id": 2, "handle": "user-2"},
        {"user_id": 3, "handle": "user-3"},
    ],
}


def test_get_user_listening_history_multiple_plays(app):
    """Tests listening history from user with multiple plays"""
    with app.app_context():
        db = get_db()

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        _index_user_listening_history(session)

        agreement_history = _get_user_listening_history(
            session,
            GetUserListeningHistoryArgs(
                user_id=1,
                current_user_id=1,
                limit=10,
                offset=0,
            ),
        )

    assert len(agreement_history) == 3
    assert (
        agreement_history[0][response_name_constants.user][response_name_constants.balance]
        is not None
    )
    assert agreement_history[0][response_name_constants.agreement_id] == 3
    assert agreement_history[0][response_name_constants.activity_timestamp] == str(
        TIMESTAMP + timedelta(minutes=4)
    )
    assert (
        agreement_history[1][response_name_constants.user][response_name_constants.balance]
        is not None
    )
    assert agreement_history[1][response_name_constants.agreement_id] == 2
    assert agreement_history[1][response_name_constants.activity_timestamp] == str(
        TIMESTAMP + timedelta(minutes=3)
    )
    assert (
        agreement_history[2][response_name_constants.user][response_name_constants.balance]
        is not None
    )
    assert agreement_history[2][response_name_constants.agreement_id] == 1
    assert agreement_history[2][response_name_constants.activity_timestamp] == str(
        TIMESTAMP + timedelta(minutes=2)
    )


def test_get_user_listening_history_no_plays(app):
    """Tests a listening history with no plays"""
    with app.app_context():
        db = get_db()

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        _index_user_listening_history(session)

        agreement_history = _get_user_listening_history(
            session,
            GetUserListeningHistoryArgs(
                user_id=3,
                current_user_id=3,
                limit=10,
                offset=0,
            ),
        )

    assert len(agreement_history) == 0


def test_get_user_listening_history_single_play(app):
    """Tests a listening history with a single play"""
    with app.app_context():
        db = get_db()

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        _index_user_listening_history(session)

        agreement_history = _get_user_listening_history(
            session,
            GetUserListeningHistoryArgs(
                user_id=2,
                current_user_id=2,
                limit=10,
                offset=0,
            ),
        )

    assert len(agreement_history) == 1
    assert (
        agreement_history[0][response_name_constants.user][response_name_constants.balance]
        is not None
    )
    assert agreement_history[0][response_name_constants.agreement_id] == 2
    assert agreement_history[0][response_name_constants.activity_timestamp] == str(
        TIMESTAMP
    )


def test_get_user_listening_history_pagination(app):
    """Tests a agreement history that's limit bounded"""
    with app.app_context():
        db = get_db()

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        _index_user_listening_history(session)

        agreement_history = _get_user_listening_history(
            session,
            GetUserListeningHistoryArgs(
                user_id=1,
                current_user_id=1,
                limit=1,
                offset=1,
            ),
        )

    assert len(agreement_history) == 1
    assert (
        agreement_history[0][response_name_constants.user][response_name_constants.balance]
        is not None
    )
    assert agreement_history[0][response_name_constants.agreement_id] == 2
    assert agreement_history[0][response_name_constants.activity_timestamp] == str(
        TIMESTAMP + timedelta(minutes=3)
    )


def test_get_user_listening_history_mismatch_user_id(app):
    """Tests a listening history with mismatching user ids"""
    with app.app_context():
        db = get_db()

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        _index_user_listening_history(session)

        agreement_history = _get_user_listening_history(
            session,
            GetUserListeningHistoryArgs(
                user_id=1,
                current_user_id=2,
                limit=10,
                offset=0,
            ),
        )

    assert len(agreement_history) == 0
