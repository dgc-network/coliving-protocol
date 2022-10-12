from datetime import datetime, timedelta

from src.models.indexing.block import Block
from src.models.digitalContents.digital_content import DigitalContent
from src.queries.get_genre_metrics import _get_genre_metrics
from src.utils.db_session import get_db


def populate_mock_db(db, test_digital_contents, date):
    """Helper function to populate thee mock DB with plays"""
    with db.scoped_session() as session:
        for i, digital_content_meta in enumerate(test_digital_contents):
            blockhash = hex(i)
            block = Block(
                blockhash=blockhash,
                number=i,
                parenthash="0x01",
                is_current=(i == 0),
            )
            digital_content = DigitalContent(
                blockhash=hex(i),
                blocknumber=i,
                digital_content_id=i,
                is_current=digital_content_meta.get("is_current", True),
                is_delete=digital_content_meta.get("is_delete", False),
                owner_id=300,
                route_id="",
                digital_content_segments=[],
                genre=digital_content_meta.get("genre", ""),
                updated_at=digital_content_meta.get("updated_at", date),
                created_at=digital_content_meta.get("created_at", date),
                is_unlisted=digital_content_meta.get("is_unlisted", False),
            )
            # add block and then flush before
            # adding digital_content, bc digital_content.blocknumber foreign key
            # references block
            session.add(block)
            session.flush()
            session.add(digital_content)


def test_get_genre_metrics(app):
    """Tests that genre metrics can be queried"""
    with app.app_context():
        db = get_db()

    test_digital_contents = [{"genre": "Electronic"}, {"genre": "Pop"}, {"genre": "Electronic"}]

    date = datetime(2020, 10, 4, 10, 35, 0)
    before_date = date + timedelta(hours=-1)
    populate_mock_db(db, test_digital_contents, date)

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

    test_digital_contents = [
        {"genre": "Electronic", "created_at": date},
        {"genre": "Pop", "created_at": date},
        {"genre": "Electronic", "created_at": date},
        {"genre": "Electronic", "created_at": before_date},
    ]
    populate_mock_db(db, test_digital_contents, date)

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
