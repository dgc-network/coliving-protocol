from integration_tests.utils import populate_mock_db
from src.models.digitalContents.digital_content import DigitalContent
from src.queries.get_prev_digital_content_entries import get_prev_digital_content_entries
from src.utils.db_session import get_db


def test_get_prev_digital_content_entries(app):
    """Tests that prev digital_content entries query properly returns previous digitalContents"""
    with app.app_context():
        db = get_db()

    test_entities = {
        "digitalContents": [
            {
                "digital_content_id": 1,
                "is_current": False,
                "is_unlisted": True,
                "remix_of": None,
            },  # Block 0
            {
                "digital_content_id": 2,
                "is_current": True,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 1
            {
                "digital_content_id": 3,
                "is_current": False,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 2
            {
                "digital_content_id": 4,
                "is_current": False,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 3
            {
                "digital_content_id": 5,
                "is_current": False,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 4
            {
                "digital_content_id": 6,
                "is_current": False,
                "is_unlisted": True,
                "remix_of": None,
            },  # Block 5
            {
                "digital_content_id": 1,
                "is_current": True,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 6
            {
                "digital_content_id": 3,
                "is_current": False,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 7
            {
                "digital_content_id": 6,
                "is_current": True,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 8
            {
                "digital_content_id": 4,
                "is_current": True,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 9
            {
                "digital_content_id": 3,
                "is_current": True,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 10
            {
                "digital_content_id": 5,
                "is_current": False,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 11
            {
                "digital_content_id": 5,
                "is_current": True,
                "is_unlisted": False,
                "remix_of": None,
            },  # Block 12
        ],
    }

    populate_mock_db(db, test_entities)

    with db.scoped_session() as session:
        # Make sure it doesn't return digitalContents if none are passed in
        empty_entries = get_prev_digital_content_entries(session, [])

        assert len(empty_entries) == 0

        # Make sure that it fetches all previous digitalContents
        entries = [
            DigitalContent(digital_content_id=6, blocknumber=8),
            DigitalContent(digital_content_id=6, blocknumber=8),
            DigitalContent(digital_content_id=3, blocknumber=10),
            DigitalContent(digital_content_id=1, blocknumber=6),
            DigitalContent(digital_content_id=4, blocknumber=9),
            DigitalContent(digital_content_id=5, blocknumber=12),
        ]
        prev_entries = get_prev_digital_content_entries(session, entries)

        assert len(prev_entries) <= len(entries)

        for prev_entry in prev_entries:
            entry = next(e for e in entries if e.digital_content_id == prev_entry.digital_content_id)
            assert entry.digital_content_id == prev_entry.digital_content_id
            assert entry.blocknumber > prev_entry.blocknumber
            # previous digital_content with id 3 should have a block number of 7, not 2
            if prev_entry.digital_content_id == 3:
                assert prev_entry.blocknumber == 7
            # previous digital_content with id 5 should have a block number of 11, not 4
            if prev_entry.digital_content_id == 5:
                assert prev_entry.blocknumber == 11

        # Make sure that it properly fetches the digital_content before the one passed
        single_entry = [DigitalContent(digital_content_id=5, blocknumber=11)]
        prev_id_5_digital_content = get_prev_digital_content_entries(session, single_entry)[0]

        assert prev_id_5_digital_content.digital_content_id == 5
        assert prev_id_5_digital_content.blocknumber < 11
