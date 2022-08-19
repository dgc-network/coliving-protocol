from datetime import datetime, timedelta

from src.models.indexing.block import Block
from src.models.agreements.agreement import Agreement
from src.queries.get_genre_metrics import _get_genre_metrics
from src.utils.db_session import get_db


def populate_mock_db(db, test_agreements, date):
    """Helper function to populate thee mock DB with plays"""
    with db.scoped_session() as session:
        for i, agreement_meta in enumerate(test_agreements):
            blockhash = hex(i)
            block = Block(
                blockhash=blockhash,
                number=i,
                parenthash="0x01",
                is_current=(i == 0),
            )
            agreement = Agreement(
                blockhash=hex(i),
                blocknumber=i,
                agreement_id=i,
                is_current=agreement_meta.get("is_current", True),
                is_delete=agreement_meta.get("is_delete", False),
                owner_id=300,
                route_id="",
                agreement_segments=[],
                genre=agreement_meta.get("genre", ""),
                updated_at=agreement_meta.get("updated_at", date),
                created_at=agreement_meta.get("created_at", date),
                is_unlisted=agreement_meta.get("is_unlisted", False),
            )
            # add block and then flush before
            # adding agreement, bc agreement.blocknumber foreign key
            # references block
            session.add(block)
            session.flush()
            session.add(agreement)


def test_get_genre_metrics(app):
    """Tests that genre metrics can be queried"""
    with app.app_context():
        db = get_db()

    test_agreements = [{"genre": "Electronic"}, {"genre": "Pop"}, {"genre": "Electronic"}]

    date = datetime(2020, 10, 4, 10, 35, 0)
    before_date = date + timedelta(hours=-1)
    populate_mock_db(db, test_agreements, date)

    args = {"start_time": before_date}

    with db.scoped_session() as session:
        metrics = _get_genre_metrics(session, args)

    assert metrics[0]["name"] == "Electronic"
    assert metrics[0]["count"] == 2
    assert metrics[1]["name"] == "Pop"
    assert metrics[1]["count"] == 1


def test_get_genre_metrics_for_month(app):
    """Tests that genre metrics can be queried over a large time range"""
    date = datetime(2020, 10, 4, 10, 35, 0)
    long_before_date = date + timedelta(days=-12)
    before_date = date + timedelta(days=-1)

    with app.app_context():
        db = get_db()

    test_agreements = [
        {"genre": "Electronic", "created_at": date},
        {"genre": "Pop", "created_at": date},
        {"genre": "Electronic", "created_at": date},
        {"genre": "Electronic", "created_at": before_date},
    ]
    populate_mock_db(db, test_agreements, date)

    args = {"start_time": before_date}

    with db.scoped_session() as session:
        metrics = _get_genre_metrics(session, args)

    assert metrics[0]["name"] == "Electronic"
    assert metrics[0]["count"] == 2
    assert metrics[1]["name"] == "Pop"
    assert metrics[1]["count"] == 1

    args2 = {"start_time": long_before_date}

    with db.scoped_session() as session:
        metrics = _get_genre_metrics(session, args2)

    assert metrics[0]["name"] == "Electronic"
    assert metrics[0]["count"] == 3
    assert metrics[1]["name"] == "Pop"
    assert metrics[1]["count"] == 1
