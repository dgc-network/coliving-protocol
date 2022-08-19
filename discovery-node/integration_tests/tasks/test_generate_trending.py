from datetime import datetime, timedelta

from src.models.indexing.block import Block
from src.models.social.aggregate_plays import AggregatePlay
from src.models.social.play import Play
from src.models.agreements.agreement import Agreement
from src.tasks.generate_trending import get_listen_counts


# Setup trending from simplified metadata
def setup_trending(db, date):
    # Test data

    # test agreements
    # when creating agreements, agreement_id == index
    test_agreements = [
        {"genre": "Electronic"},
        {"genre": "Pop"},
        {"genre": "Electronic"},
        # Agreements we don't want to count
        {"genre": "Electronic", "is_unlisted": True},
        {"genre": "Electronic", "is_delete": True},
    ]

    test_plays = [
        # Current Plays
        {"item_id": 0},
        {"item_id": 0},
        {"item_id": 1},
        {"item_id": 1},
        {"item_id": 2},
        {"item_id": 3},
        # > 1 wk plays
        {"item_id": 2, "created_at": date - timedelta(weeks=2)},
        {"item_id": 2, "created_at": date - timedelta(weeks=2)},
        {"item_id": 3, "created_at": date - timedelta(weeks=2)},
        # We don't want to count these guys (agreements deleted/unlisted)
        {"item_id": 3},
        {"item_id": 3},
        {"item_id": 4},
        {"item_id": 4},
    ]

    # pylint: disable=W0621
    with db.scoped_session() as session:
        # seed agreements + blocks
        for i, agreement_meta in enumerate(test_agreements):
            blockhash = hex(i)
            block = Block(
                blockhash=blockhash,
                number=i,
                parenthash="0x01",
                is_current=True,
            )

            agreement = Agreement(
                blockhash=blockhash,
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

        # seed plays
        aggregate_plays = {}
        for i, play_meta in enumerate(test_plays):
            item_id = play_meta.get("item_id")
            if item_id in aggregate_plays:
                aggregate_plays[item_id] += 1
            else:
                aggregate_plays[item_id] = 1

            play = Play(
                id=i, play_item_id=item_id, created_at=play_meta.get("created_at", date)
            )
            session.add(play)
        for i, count in aggregate_plays.items():
            session.add(AggregatePlay(play_item_id=i, count=count))


# Helper to sort results before validating
def validate_results(actual, expected):
    assert sorted(actual, key=lambda x: x["agreement_id"]) == sorted(
        expected, key=lambda x: x["agreement_id"]
    )


# Tests


def test_get_listen_counts_year(postgres_mock_db):
    """Happy path test: test that we get all valid listens from prior year"""
    # setup
    date = datetime.now()
    setup_trending(postgres_mock_db, date)

    # run
    with postgres_mock_db.scoped_session() as session:
        res = get_listen_counts(session, "year", None, 10, 0)

    # validate
    expected = [
        {"agreement_id": 0, "listens": 2, "created_at": date},
        {"agreement_id": 1, "listens": 2, "created_at": date},
        {"agreement_id": 2, "listens": 3, "created_at": date},
    ]
    validate_results(res, expected)


def test_get_listen_counts_week(postgres_mock_db):
    """Test slicing by time range"""
    # setup
    date = datetime.now()
    setup_trending(postgres_mock_db, date)

    # run
    with postgres_mock_db.scoped_session() as session:
        res = get_listen_counts(session, "week", None, 10, 0)

    # validate
    expected = [
        {"agreement_id": 0, "listens": 2, "created_at": date},
        {"agreement_id": 1, "listens": 2, "created_at": date},
        {"agreement_id": 2, "listens": 1, "created_at": date},
    ]
    validate_results(res, expected)


def test_get_listen_counts_genre_filtered(postgres_mock_db):
    """Test slicing by genre"""
    # setup
    date = datetime.now()
    setup_trending(postgres_mock_db, date)

    # run
    with postgres_mock_db.scoped_session() as session:
        res = get_listen_counts(session, "year", "Pop", 10, 0)

    # validate
    expected = [{"agreement_id": 1, "listens": 2, "created_at": date}]
    validate_results(res, expected)


def test_get_listen_counts_all_time(postgres_mock_db):
    """Test slicing by genre"""
    # setup
    date = datetime.now()
    setup_trending(postgres_mock_db, date)

    # run
    with postgres_mock_db.scoped_session() as session:
        res = get_listen_counts(session, None, None, 10, 0)

    # validate
    expected = [
        {"agreement_id": 0, "listens": 2, "created_at": date},
        {"agreement_id": 1, "listens": 2, "created_at": date},
        {"agreement_id": 2, "listens": 3, "created_at": date},
    ]
    validate_results(res, expected)
