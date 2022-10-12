import random
from datetime import datetime
from unittest.mock import patch

from integration_tests.challenges.index_helpers import (
    AttrDict,
    CIDMetadataClient,
    UpdateTask,
)
from src.challenges.challenge_event_bus import ChallengeEventBus, setup_challenge_bus
from src.models.indexing.block import Block
from src.models.indexing.skipped_transaction import (
    SkippedTransaction,
    SkippedTransactionLevel,
)
from src.models.agreements.digital_content import DigitalContent
from src.models.agreements.digital_content_route import AgreementRoute
from src.models.users.user import User
from src.tasks.index import revert_blocks
from src.tasks.agreements import (
    lookup_digital_content_record,
    parse_digital_content_event,
    digital_content_event_types_lookup,
    digital_content_state_update,
)
from src.utils import helpers
from src.utils.db_session import get_db
from web3 import Web3

block_hash = b"0x8f19da326900d171642af08e6770eedd83509c6c44f6855c98e6a752844e2521"


def get_new_digital_content_event():
    event_type = digital_content_event_types_lookup["new_digital_content"]
    new_digital_content_event = AttrDict(
        {
            "_id": 1,
            "_digital_contentOwnerId": 1,
            "_multihashDigest": b"@\xfe\x1f\x02\xf3i%\xa5+\xec\x8dh\x82\xc5}\x17"
            + b"\x91\xb9\xa1\x8dg j\xc0\xcd\x879K\x80\xf2\xdbg",
            "_multihashHashFn": 18,
            "_multihashSize": 32,
        }
    )
    return event_type, AttrDict({"blockHash": block_hash, "args": new_digital_content_event})


def get_new_digital_content_event_dupe():
    event_type = digital_content_event_types_lookup["new_digital_content"]
    new_digital_content_event = AttrDict(
        {
            "_id": 2,
            "_digital_contentOwnerId": 1,
            "_multihashDigest": b"@\xfe\x1f\x02\xf3i%\xa5+\xec\x8dh"
            + b"\x82\xc5}\x17\x91\xb9\xa1\x8dg j\xc0\xcd\x879K\x80\xf2\xdbg",
            "_multihashHashFn": 18,
            "_multihashSize": 32,
        }
    )
    return event_type, AttrDict({"blockHash": block_hash, "args": new_digital_content_event})


def get_update_digital_content_event():
    event_type = digital_content_event_types_lookup["update_digital_content"]
    update_digital_content_event = AttrDict(
        {
            "_digital_contentId": 1,
            "_digital_contentOwnerId": 1,
            "_multihashDigest": b"\x93\x7f\xa2\xe6\xf0\xe5\xb5f\xca"
            + b"\x14(4m.B\xba3\xf8\xc8<|%*{\x11\xc1\xe2/\xd7\xee\xd7q",
            "_multihashHashFn": 18,
            "_multihashSize": 32,
        }
    )
    return event_type, AttrDict({"blockHash": block_hash, "args": update_digital_content_event})


def get_delete_digital_content_event():
    event_type = digital_content_event_types_lookup["delete_digital_content"]
    delete_digital_content_event = AttrDict({"_digital_contentId": 1})
    return event_type, AttrDict({"blockHash": block_hash, "args": delete_digital_content_event})


multihash = helpers.multihash_digest_to_cid(
    b"@\xfe\x1f\x02\xf3i%\xa5+\xec\x8dh\x82"
    + b"\xc5}\x17\x91\xb9\xa1\x8dg j\xc0\xcd\x879K\x80\xf2\xdbg"
)
multihash2 = helpers.multihash_digest_to_cid(
    b"\x93\x7f\xa2\xe6\xf0\xe5\xb5f\xca\x14(4m.B"
    + b"\xba3\xf8\xc8<|%*{\x11\xc1\xe2/\xd7\xee\xd7q"
)

cid_metadata_client = CIDMetadataClient(
    {
        multihash: {
            "owner_id": 1,
            "title": "real magic bassy flip",
            "length": None,
            "cover_art": None,
            "cover_art_sizes": "QmdxhDiRUC3zQEKqwnqksaSsSSeHiRghjwKzwoRvm77yaZ",
            "tags": "realmagic,rickyreed,theroom",
            "genre": "R&B/Soul",
            "mood": "Empowering",
            "credits_splits": None,
            "created_at": "2020-07-11 08:22:15",
            "create_date": None,
            "updated_at": "2020-07-11 08:22:15",
            "release_date": "Sat Jul 11 2020 01:19:58 GMT-0700",
            "file_type": None,
            "digital_content_segments": [
                {
                    "duration": 6.016,
                    "multihash": "QmabM5svgDgcRdQZaEKSMBCpSZrrYy2y87L8Dx8EQ3T2jp",
                }
            ],
            "has_current_user_reposted": False,
            "is_current": True,
            "is_unlisted": False,
            "field_visibility": {
                "mood": True,
                "tags": True,
                "genre": True,
                "share": True,
                "play_count": True,
                "remixes": True,
            },
            "remix_of": {"agreements": [{"parent_digital_content_id": 75808}]},
            "repost_count": 12,
            "save_count": 21,
            "description": None,
            "license": "All rights reserved",
            "isrc": None,
            "iswc": None,
            "download": {
                "cid": None,
                "is_downloadable": False,
                "requires_follow": False,
            },
            "digital_content_id": 77955,
            "stem_of": None,
        },
        multihash2: {
            "owner_id": 1,
            "title": "real magic bassy flip 2",
            "length": None,
            "cover_art": None,
            "cover_art_sizes": "QmdxhDiRUC3zQEKqwnqksaSsSSeHiRghjwKzwoRvm77yaZ",
            "tags": "realmagic,rickyreed,theroom",
            "genre": "R&B/Soul",
            "mood": "Empowering",
            "credits_splits": None,
            "created_at": "2020-07-11 08:22:15",
            "create_date": None,
            "updated_at": "2020-07-11 08:22:15",
            "release_date": "Sat Jul 11 2020 01:19:58 GMT-0700",
            "file_type": None,
            "digital_content_segments": [
                {
                    "duration": 6.016,
                    "multihash": "QmabM5svgDgcRdQZaEKSMBCpSZrrYy2y87L8Dx8EQ3T2jp",
                }
            ],
            "has_current_user_reposted": False,
            "is_current": True,
            "is_unlisted": False,
            "field_visibility": {
                "mood": True,
                "tags": True,
                "genre": True,
                "share": True,
                "play_count": True,
                "remixes": True,
            },
            "remix_of": {"agreements": [{"parent_digital_content_id": 75808}]},
            "repost_count": 12,
            "save_count": 21,
            "description": None,
            "license": "All rights reserved",
            "isrc": None,
            "iswc": None,
            "download": {
                "cid": None,
                "is_downloadable": False,
                "requires_follow": False,
            },
            "digital_content_id": 77955,
            "stem_of": None,
        },
    }
)


# ========================================== Start Tests ==========================================
@patch("src.tasks.index")
def test_index_digital_contents(mock_index_task, app):
    """Tests that agreements are indexed correctly"""
    with app.app_context():
        db = get_db()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        web3 = Web3()
        update_task = UpdateTask(cid_metadata_client, web3, challenge_event_bus)

    pending_digital_content_routes = []

    with db.scoped_session() as session, challenge_event_bus.use_scoped_dispatch_queue():
        # ================== Test New DigitalContent Event ==================
        event_type, entry = get_new_digital_content_event()

        block_number = random.randint(1, 10000)
        block_timestamp = 1585336422
        updated_block_hash = f"0x{block_number}"

        # Some sqlalchemy user instance
        digital_content_record = lookup_digital_content_record(
            update_task,
            session,
            entry,
            1,  # event digital_content id
            block_number,
            updated_block_hash,
            "0x",  # txhash
        )

        assert digital_content_record.updated_at == None

        # Fields set to defaults
        assert digital_content_record.created_at == None
        assert digital_content_record.owner_id == None
        assert digital_content_record.is_delete == False

        # Create digital_content's owner user before
        block = Block(
            blockhash=updated_block_hash, number=block_number, is_current=True
        )
        session.add(block)
        session.flush()

        digital_content_owner = User(
            is_current=True,
            user_id=entry.args._digital_contentOwnerId,
            handle="ray",
            blockhash=updated_block_hash,
            blocknumber=block_number,
            content_node_endpoint=(
                "http://cn2_content-node_1:4001,http://cn1_content-node_1:4000,"
                "http://cn3_content-node_1:4002"
            ),
            created_at=datetime.utcfromtimestamp(block_timestamp),
            updated_at=datetime.utcfromtimestamp(block_timestamp),
        )
        session.add(digital_content_owner)

        entry_multihash = helpers.multihash_digest_to_cid(
            b"@\xfe\x1f\x02\xf3i%\xa5+\xec\x8dh\x82\xc5}"
            + b"\x17\x91\xb9\xa1\x8dg j\xc0\xcd\x879K\x80\xf2\xdbg"
        )
        digital_content_metadata = update_task.cid_metadata_client.get_metadata(
            entry_multihash, "", ""
        )

        digital_content_record = parse_digital_content_event(
            None,  # self - not used
            session,
            update_task,  # only need the ipfs client for get_metadata
            entry,  # Contains the event args used for updating
            event_type,  # String that should one of user_event_types_lookup
            digital_content_record,  # User ORM instance
            block_number,  # Used to forward to digital_content uploads challenge
            block_timestamp,  # Used to update the user.updated_at field
            digital_content_metadata,
            pending_digital_content_routes,
        )
        session.add(digital_content_record)

        # updated_at should be updated every parse_digital_content_event
        assert digital_content_record.updated_at == datetime.utcfromtimestamp(block_timestamp)

        # new_digital_content updated fields
        assert digital_content_record.created_at == datetime.utcfromtimestamp(block_timestamp)
        assert digital_content_record.owner_id == entry.args._digital_contentOwnerId
        assert digital_content_record.is_delete == False

        assert digital_content_record.title == digital_content_metadata["title"]
        assert digital_content_record.length == 0
        assert digital_content_record.cover_art == None
        assert digital_content_record.cover_art_sizes == digital_content_metadata["cover_art_sizes"]
        assert digital_content_record.tags == digital_content_metadata["tags"]
        assert digital_content_record.genre == digital_content_metadata["genre"]
        assert digital_content_record.mood == digital_content_metadata["mood"]
        assert digital_content_record.credits_splits == digital_content_metadata["credits_splits"]
        assert digital_content_record.create_date == digital_content_metadata["create_date"]
        assert digital_content_record.release_date == digital_content_metadata["release_date"]
        assert digital_content_record.file_type == digital_content_metadata["file_type"]
        assert digital_content_record.description == digital_content_metadata["description"]
        assert digital_content_record.license == digital_content_metadata["license"]
        assert digital_content_record.isrc == digital_content_metadata["isrc"]
        assert digital_content_record.iswc == digital_content_metadata["iswc"]
        assert digital_content_record.digital_content_segments == digital_content_metadata["digital_content_segments"]
        assert digital_content_record.is_unlisted == digital_content_metadata["is_unlisted"]
        assert digital_content_record.field_visibility == digital_content_metadata["field_visibility"]
        assert digital_content_record.remix_of == digital_content_metadata["remix_of"]
        assert digital_content_record.download == {
            "is_downloadable": digital_content_metadata["download"].get("is_downloadable")
            == True,
            "requires_follow": digital_content_metadata["download"].get("requires_follow")
            == True,
            "cid": digital_content_metadata["download"].get("cid", None),
        }

        # ================== Test Update DigitalContent Event ==================
        prev_block = session.query(Block).filter(Block.is_current == True).one()
        prev_block.is_current = False
        block_number += 1
        updated_block_hash = f"0x{block_number}"
        # Create a new block to test reverts later
        second_block = Block(
            blockhash=updated_block_hash, number=block_number, is_current=True
        )
        session.add(second_block)
        session.flush()

        # Refresh the digital_content record
        digital_content_record = lookup_digital_content_record(
            update_task,
            session,
            entry,
            1,  # event digital_content id
            block_number,
            updated_block_hash,
            "0x",  # txhash
        )

        event_type, entry = get_update_digital_content_event()

        entry_multihash = helpers.multihash_digest_to_cid(
            b"\x93\x7f\xa2\xe6\xf0\xe5\xb5f\xca\x14(4m.B"
            + b"\xba3\xf8\xc8<|%*{\x11\xc1\xe2/\xd7\xee\xd7q"
        )
        digital_content_metadata = update_task.cid_metadata_client.get_metadata(
            entry_multihash, "", ""
        )

        parse_digital_content_event(
            None,
            session,
            update_task,
            entry,
            event_type,
            digital_content_record,
            block_number,
            block_timestamp,
            digital_content_metadata,
            pending_digital_content_routes,
        )

        # Check that digital_content routes are updated appropriately
        digital_content_routes = session.query(AgreementRoute).filter(AgreementRoute.digital_content_id == 1).all()
        # Should have the two routes created on digital_content creation as well as two more for the update
        assert len(digital_content_routes) == 2, "Has two total routes after a digital_content name update"
        assert (
            len(
                [
                    route
                    for route in digital_content_routes
                    if route.is_current is True
                    and route.slug == "real-magic-bassy-flip-2"
                ]
            )
            == 1
        ), "The current route is 'real-magic-bassy-flip-2'"
        assert (
            len([route for route in digital_content_routes if route.is_current is False]) == 1
        ), "One route is marked non-current"
        assert (
            len(
                [
                    route
                    for route in digital_content_routes
                    if route.slug
                    in ("real-magic-bassy-flip-2", "real-magic-bassy-flip")
                ]
            )
            == 2
        ), "Has both of the 'new-style' routes"

        # ============== Test DigitalContent Route Collisions ===================

        # Attempts to insert a new digital_content with the route "real-magic-bassy-flip"
        # Should attempt to try to route to "real-magic-bassy-flip", but
        # that should be taken by the rename above, so the fallback logic
        # should trigger making it go to "real-magic-bassy-flip-1"
        event_type, entry = get_new_digital_content_event_dupe()
        digital_content_record_dupe = lookup_digital_content_record(
            update_task,
            session,
            entry,
            40,  # event digital_content id
            block_number,
            updated_block_hash,
            "0x",  # txhash
        )

        entry_multihash = helpers.multihash_digest_to_cid(
            b"@\xfe\x1f\x02\xf3i%\xa5+\xec\x8dh\x82\xc5}"
            + b"\x17\x91\xb9\xa1\x8dg j\xc0\xcd\x879K\x80\xf2\xdbg"
        )
        digital_content_metadata = update_task.cid_metadata_client.get_metadata(
            entry_multihash, "", ""
        )

        parse_digital_content_event(
            None,
            session,
            update_task,
            entry,
            event_type,
            digital_content_record_dupe,
            block_number,
            block_timestamp,
            digital_content_metadata,
            pending_digital_content_routes,
        )

        # Check that digital_content routes are assigned appropriately
        digital_content_routes = session.query(AgreementRoute).filter(AgreementRoute.digital_content_id == 40).all()
        assert [
            route
            for route in digital_content_routes
            if route.slug == "real-magic-bassy-flip-1"
            and route.collision_id == 1
            and route.is_current is True
            and route.title_slug == "real-magic-bassy-flip"
        ], "New route should be current and go to collision id 1"

        # Another "real-magic-bassy-flip", which should find collision id 1 and
        # easily jump to collision id 2, but then conflict with the rename above
        # and require the additional failsafe collision detection to go to collision id 3
        event_type, entry = get_new_digital_content_event_dupe()

        digital_content_record_dupe = lookup_digital_content_record(
            update_task,
            session,
            entry,
            30,  # event digital_content id
            block_number,
            updated_block_hash,
            "0x",  # txhash
        )

        parse_digital_content_event(
            None,
            session,
            update_task,
            entry,
            event_type,
            digital_content_record_dupe,
            block_number,
            block_timestamp,
            digital_content_metadata,
            pending_digital_content_routes,
        )

        # Check that digital_content routes are assigned appropriately
        digital_content_routes = session.query(AgreementRoute).filter(AgreementRoute.digital_content_id == 30).all()
        assert [
            route
            for route in digital_content_routes
            if route.is_current is True
            and route.title_slug == "real-magic-bassy-flip"
            and route.slug == "real-magic-bassy-flip-3"
            and route.collision_id == 3
        ], "New route should be current and go to collision id 3"

        # ================== Test Revert AgreementRoute ===================

        # Assert that there exists a previous record to revert to
        # that isn't marked as is_current
        digital_content_route = (
            session.query(AgreementRoute)
            .filter(AgreementRoute.digital_content_id == 1, AgreementRoute.is_current == False)
            .all()
        )
        assert digital_content_route

        # Make sure the blocks are committed
        session.commit()
        pending_digital_content_routes.clear()
        revert_blocks(mock_index_task, db, [second_block])
        # Commit the revert
        session.commit()

        digital_content_routes = session.query(AgreementRoute).all()

        # That old route should now be marked as is_current
        assert [
            route
            for route in digital_content_routes
            if route.is_current == True
            and route.digital_content_id == 1
            and route.slug == "real-magic-bassy-flip"
        ], "Old route should be marked as current again"
        assert (
            len(
                [
                    route
                    for route in digital_content_routes
                    if route.is_current == True and route.digital_content_id == 1
                ]
            )
            == 1
        ), "Only one route should be marked as current"

        # ================== Test Delete DigitalContent Event ==================
        event_type, entry = get_delete_digital_content_event()

        parse_digital_content_event(
            None,  # self - not used
            session,
            update_task,  # only need the ipfs client for get_metadata
            entry,  # Contains the event args used for updating
            event_type,  # String that should one of user_event_types_lookup
            digital_content_record,  # User ORM instance
            block_number,  # Used to forward to digital_content uploads challenge
            block_timestamp,  # Used to update the user.updated_at field
            None,
            pending_digital_content_routes,
        )

        # =================== Test digital_content __repr___ ======================

        print(digital_content_record)

        # updated_at should be updated every parse_digital_content_event
        assert digital_content_record.is_delete == True


def test_digital_content_indexing_skip_tx(app, mocker):
    """Tests that agreements skip cursed txs without throwing an error and are able to process other tx in block"""
    with app.app_context():
        db = get_db()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        web3 = Web3()
        update_task = UpdateTask(cid_metadata_client, web3, challenge_event_bus)

    class TestAgreementTransaction:
        pass

    blessed_tx_hash = (
        "0x34004dfaf5bb7cf9998eaf387b877d72d198c6508608e309df3f89e57def4db3"
    )
    blessed_tx = TestAgreementTransaction()
    blessed_tx.transactionHash = update_task.web3.toBytes(hexstr=blessed_tx_hash)
    cursed_tx_hash = (
        "0x5fe51d735309d3044ae30055ad29101018a1a399066f6c53ea23800225e3a3be"
    )
    cursed_tx = TestAgreementTransaction()
    cursed_tx.transactionHash = update_task.web3.toBytes(hexstr=cursed_tx_hash)
    test_block_number = 25278765
    test_block_timestamp = 1
    test_block_hash = update_task.web3.toHex(block_hash)
    test_digital_content_factory_txs = [cursed_tx, blessed_tx]
    test_timestamp = datetime.utcfromtimestamp(test_block_timestamp)
    blessed_digital_content_record = DigitalContent(
        blockhash=test_block_hash,
        blocknumber=test_block_number,
        txhash=blessed_tx_hash,
        digital_content_id=91232,
        is_unlisted=False,
        route_id="test",
        digital_content_segments=[
            {
                "duration": 6.016,
                "multihash": "QmabM5svgDgcRdQZaEKSMBCpSZrrYy2y87L8Dx8EQ3T2jp",
            }
        ],
        is_current=True,
        is_delete=True,
        updated_at=test_timestamp,
        created_at=test_timestamp,
        owner_id=1,
    )
    cursed_digital_content_record = DigitalContent(
        blockhash=test_block_hash,
        blocknumber=test_block_number,
        txhash=cursed_tx_hash,
        digital_content_id=91238,
        is_unlisted=None,
        is_current=True,
        is_delete=True,
        updated_at=test_timestamp,
        created_at=None,
    )

    mocker.patch(
        "src.tasks.agreements.lookup_digital_content_record",
        side_effect=[cursed_digital_content_record, blessed_digital_content_record],
        autospec=True,
    )
    mocker.patch(
        "src.tasks.agreements.get_digital_content_events_tx",
        side_effect=[
            [],  # no new digital_content events
            [],
            [
                {
                    "args": AttrDict(
                        {
                            "_digital_contentId": cursed_digital_content_record.digital_content_id,
                        }
                    )
                },
            ],  # digital_content deleted event
            [],  # second tx processing loop
            [],
            [
                {
                    "args": AttrDict(
                        {
                            "_digital_contentId": blessed_digital_content_record.digital_content_id,
                        }
                    )
                },
            ],  # digital_content deleted event
        ],
        autospec=True,
    )

    test_ipfs_metadata = {}

    with db.scoped_session() as session, challenge_event_bus.use_scoped_dispatch_queue():
        try:
            current_block = Block(
                blockhash=test_block_hash,
                parenthash=test_block_hash,
                number=test_block_number,
                is_current=True,
            )
            session.add(current_block)
            (total_changes, updated_digital_content_ids_set) = digital_content_state_update(
                update_task,
                update_task,
                session,
                test_digital_content_factory_txs,
                test_block_number,
                test_block_timestamp,
                block_hash,
                test_ipfs_metadata,
            )
            assert len(updated_digital_content_ids_set) == 1
            assert list(updated_digital_content_ids_set)[0] == blessed_digital_content_record.digital_content_id
            assert total_changes == 1
            assert (
                session.query(SkippedTransaction)
                .filter(
                    SkippedTransaction.txhash == cursed_digital_content_record.txhash,
                    SkippedTransaction.level == SkippedTransactionLevel.node,
                )
                .first()
            )
            assert (
                session.query(DigitalContent)
                .filter(DigitalContent.digital_content_id == blessed_digital_content_record.digital_content_id)
                .first()
            )
            assert (
                session.query(DigitalContent)
                .filter(DigitalContent.digital_content_id == cursed_digital_content_record.digital_content_id)
                .first()
            ) == None
        except Exception:
            assert False
