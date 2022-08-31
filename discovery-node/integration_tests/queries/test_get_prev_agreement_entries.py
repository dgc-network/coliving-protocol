from integration_tests.utils import populate_mock_db
from src.models.agreements.agreement import Agreement
from src.queries.get_prev_agreement_entries import get_prev_agreement_entries
from src.utils.db_session import get_db


def test_get_prev_agreement_entries(app):
    """Tests that prev agreement entries query properly returns previous agreements"""
    with app.app_context():
        db = get_db()

    test_entities = {
        "agreements": [
            {
                "agreement_id": 1,
                "is_current": False,
                "is_unlisted": True,
                "remix_of": None,
            },  # Block 0
            {
                "agreement_id": 2,
                "is_current": True,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 1
            {
                "agreement_id": 3,
                "is_current": False,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 2
            {
                "agreement_id": 4,
                "is_current": False,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 3
            {
                "agreement_id": 5,
                "is_current": False,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 4
            {
                "agreement_id": 6,
                "is_current": False,
                "is_unlisted": True,
                "remix_of": None,
            },  # Block 5
            {
                "agreement_id": 1,
                "is_current": True,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 6
            {
                "agreement_id": 3,
                "is_current": False,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 7
            {
                "agreement_id": 6,
                "is_current": True,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 8
            {
                "agreement_id": 4,
                "is_current": True,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 9
            {
                "agreement_id": 3,
                "is_current": True,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 10
            {
                "agreement_id": 5,
                "is_current": False,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 11
            {
                "agreement_id": 5,
                "is_current": True,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 12
        ],
    }

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        # Make sure it doesn't return agreements if none are passed in
        empty_entries = get_prev_agreement_entries(session, [])

        assert len(empty_entries) == 0

        # Make sure that it fetches all previous agreements
        entries = [
            Agreement(agreement_id=6, blocknumber=8),
            Agreement(agreement_id=6, blocknumber=8),
            Agreement(agreement_id=3, blocknumber=10),
            Agreement(agreement_id=1, blocknumber=6),
            Agreement(agreement_id=4, blocknumber=9),
            Agreement(agreement_id=5, blocknumber=12),
        ]
        prev_entries = get_prev_agreement_entries(session, entries)

        assert len(prev_entries) <= len(entries)

        for prev_entry in prev_entries:
            entry = next(e for e in entries if e.agreement_id == prev_entry.agreement_id)
            assert entry.agreement_id == prev_entry.agreement_id
            assert entry.blocknumber > prev_entry.blocknumber
            # previous agreement with id 3 should have a block number of 7, not 2
            if prev_entry.agreement_id == 3:
                assert prev_entry.blocknumber == 7
            # previous agreement with id 5 should have a block number of 11, not 4
            if prev_entry.agreement_id == 5:
                assert prev_entry.blocknumber == 11

        # Make sure that it properly fetches the agreement before the one passed
        single_entry = [Agreement(agreement_id=5, blocknumber=11)]
        prev_id_5_agreement = get_prev_agreement_entries(session, single_entry)[0]

        assert prev_id_5_agreement.agreement_id == 5
        assert prev_id_5_agreement.blocknumber < 11
