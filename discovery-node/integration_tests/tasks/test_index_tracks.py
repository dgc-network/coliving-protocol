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
from src.models.agreements.agreement import Agreement
from src.models.agreements.agreement_route import AgreementRoute
from src.models.users.user import User
from src.tasks.index import revert_blocks
from src.tasks.agreements import (
    lookup_agreement_record,
    parse_agreement_event,
    agreement_event_types_lookup,
    agreement_state_update,
)
from src.utils import helpers
from src.utils.db_session import get_db
from web3 import Web3

block_hash = b"0x8f19da326900d171642af08e6770eedd83509c6c44f6855c98e6a752844e2521"


def get_new_agreement_event():
    event_type = agreement_event_types_lookup["new_agreement"]
    new_agreement_event = AttrDict(
        {
            "_id": 1,
            "_agreementOwnerId": 1,
            "_multihashDigest": b"@\xfe\x1f\x02\xf3i%\xa5+\xec\x8dh\x82\xc5}\x17"
            + b"\x91\xb9\xa1\x8dg j\xc0\xcd\x879K\x80\xf2\xdbg",
            "_multihashHashFn": 18,
            "_multihashSize": 32,
        }
    )
    return event_type, AttrDict({"blockHash": block_hash, "args": new_agreement_event})


def get_new_agreement_event_dupe():
    event_type = agreement_event_types_lookup["new_agreement"]
    new_agreement_event = AttrDict(
        {
            "_id": 2,
            "_agreementOwnerId": 1,
            "_multihashDigest": b"@\xfe\x1f\x02\xf3i%\xa5+\xec\x8dh"
            + b"\x82\xc5}\x17\x91\xb9\xa1\x8dg j\xc0\xcd\x879K\x80\xf2\xdbg",
            "_multihashHashFn": 18,
            "_multihashSize": 32,
        }
    )
    return event_type, AttrDict({"blockHash": block_hash, "args": new_agreement_event})


def get_update_agreement_event():
    event_type = agreement_event_types_lookup["update_agreement"]
    update_agreement_event = AttrDict(
        {
            "_agreementId": 1,
            "_agreementOwnerId": 1,
            "_multihashDigest": b"\x93\x7f\xa2\xe6\xf0\xe5\xb5f\xca"
            + b"\x14(4m.B\xba3\xf8\xc8<|%*{\x11\xc1\xe2/\xd7\xee\xd7q",
            "_multihashHashFn": 18,
            "_multihashSize": 32,
        }
    )
    return event_type, AttrDict({"blockHash": block_hash, "args": update_agreement_event})


def get_delete_agreement_event():
    event_type = agreement_event_types_lookup["delete_agreement"]
    delete_agreement_event = AttrDict({"_agreementId": 1})
    return event_type, AttrDict({"blockHash": block_hash, "args": delete_agreement_event})


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
            "agreement_segments": [
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
            "remix_of": {"agreements": [{"parent_agreement_id": 75808}]},
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
            "agreement_id": 77955,
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
            "agreement_segments": [
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
            "remix_of": {"agreements": [{"parent_agreement_id": 75808}]},
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
            "agreement_id": 77955,
            "stem_of": None,
        },
    }
)


# ========================================== Start Tests ==========================================
@patch("src.tasks.index")
def test_index_agreements(mock_index_task, app):
    """Tests that agreements are indexed correctly"""
    with app.app_context():
        db = get_db()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        web3 = Web3()
        update_task = UpdateTask(cid_metadata_client, web3, challenge_event_bus)

    pending_agreement_routes = []

    with db.scoped_session() as session, challenge_event_bus.use_scoped_dispatch_queue():
        # ================== Test New Agreement Event ==================
        event_type, entry = get_new_agreement_event()

        block_number = random.randint(1, 10000)
        block_timestamp = 1585336422
        updated_block_hash = f"0x{block_number}"

        # Some sqlalchemy user instance
        agreement_record = lookup_agreement_record(
            update_task,
            session,
            entry,
            1,  # event agreement id
            block_number,
            updated_block_hash,
            "0x",  # txhash
        )

        assert agreement_record.updated_at == None

        # Fields set to defaults
        assert agreement_record.created_at == None
        assert agreement_record.owner_id == None
        assert agreement_record.is_delete == False

        # Create agreement's owner user before
        block = Block(
            blockhash=updated_block_hash, number=block_number, is_current=True
        )
        session.add(block)
        session.flush()

        agreement_owner = User(
            is_current=True,
            user_id=entry.args._agreementOwnerId,
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
        session.add(agreement_owner)

        entry_multihash = helpers.multihash_digest_to_cid(
            b"@\xfe\x1f\x02\xf3i%\xa5+\xec\x8dh\x82\xc5}"
            + b"\x17\x91\xb9\xa1\x8dg j\xc0\xcd\x879K\x80\xf2\xdbg"
        )
        agreement_metadata = update_task.cid_metadata_client.get_metadata(
            entry_multihash, "", ""
        )

        agreement_record = parse_agreement_event(
            None,  # self - not used
            session,
            update_task,  # only need the ipfs client for get_metadata
            entry,  # Contains the event args used for updating
            event_type,  # String that should one of user_event_types_lookup
            agreement_record,  # User ORM instance
            block_number,  # Used to forward to agreement uploads challenge
            block_timestamp,  # Used to update the user.updated_at field
            agreement_metadata,
            pending_agreement_routes,
        )
        session.add(agreement_record)

        # updated_at should be updated every parse_agreement_event
        assert agreement_record.updated_at == datetime.utcfromtimestamp(block_timestamp)

        # new_agreement updated fields
        assert agreement_record.created_at == datetime.utcfromtimestamp(block_timestamp)
        assert agreement_record.owner_id == entry.args._agreementOwnerId
        assert agreement_record.is_delete == False

        assert agreement_record.title == agreement_metadata["title"]
        assert agreement_record.length == 0
        assert agreement_record.cover_art == None
        assert agreement_record.cover_art_sizes == agreement_metadata["cover_art_sizes"]
        assert agreement_record.tags == agreement_metadata["tags"]
        assert agreement_record.genre == agreement_metadata["genre"]
        assert agreement_record.mood == agreement_metadata["mood"]
        assert agreement_record.credits_splits == agreement_metadata["credits_splits"]
        assert agreement_record.create_date == agreement_metadata["create_date"]
        assert agreement_record.release_date == agreement_metadata["release_date"]
        assert agreement_record.file_type == agreement_metadata["file_type"]
        assert agreement_record.description == agreement_metadata["description"]
        assert agreement_record.license == agreement_metadata["license"]
        assert agreement_record.isrc == agreement_metadata["isrc"]
        assert agreement_record.iswc == agreement_metadata["iswc"]
        assert agreement_record.agreement_segments == agreement_metadata["agreement_segments"]
        assert agreement_record.is_unlisted == agreement_metadata["is_unlisted"]
        assert agreement_record.field_visibility == agreement_metadata["field_visibility"]
        assert agreement_record.remix_of == agreement_metadata["remix_of"]
        assert agreement_record.download == {
            "is_downloadable": agreement_metadata["download"].get("is_downloadable")
            == True,
            "requires_follow": agreement_metadata["download"].get("requires_follow")
            == True,
            "cid": agreement_metadata["download"].get("cid", None),
        }

        # ================== Test Update Agreement Event ==================
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

        # Refresh the agreement record
        agreement_record = lookup_agreement_record(
            update_task,
            session,
            entry,
            1,  # event agreement id
            block_number,
            updated_block_hash,
            "0x",  # txhash
        )

        event_type, entry = get_update_agreement_event()

        entry_multihash = helpers.multihash_digest_to_cid(
            b"\x93\x7f\xa2\xe6\xf0\xe5\xb5f\xca\x14(4m.B"
            + b"\xba3\xf8\xc8<|%*{\x11\xc1\xe2/\xd7\xee\xd7q"
        )
        agreement_metadata = update_task.cid_metadata_client.get_metadata(
            entry_multihash, "", ""
        )

        parse_agreement_event(
            None,
            session,
            update_task,
            entry,
            event_type,
            agreement_record,
            block_number,
            block_timestamp,
            agreement_metadata,
            pending_agreement_routes,
        )

        # Check that agreement routes are updated appropriately
        agreement_routes = session.query(AgreementRoute).filter(AgreementRoute.agreement_id == 1).all()
        # Should have the two routes created on agreement creation as well as two more for the update
        assert len(agreement_routes) == 2, "Has two total routes after a agreement name update"
        assert (
            len(
                [
                    route
                    for route in agreement_routes
                    if route.is_current is True
                    and route.slug == "real-magic-bassy-flip-2"
                ]
            )
            == 1
        ), "The current route is 'real-magic-bassy-flip-2'"
        assert (
            len([route for route in agreement_routes if route.is_current is False]) == 1
        ), "One route is marked non-current"
        assert (
            len(
                [
                    route
                    for route in agreement_routes
                    if route.slug
                    in ("real-magic-bassy-flip-2", "real-magic-bassy-flip")
                ]
            )
            == 2
        ), "Has both of the 'new-style' routes"

        # ============== Test Agreement Route Collisions ===================

        # Attempts to insert a new agreement with the route "real-magic-bassy-flip"
        # Should attempt to try to route to "real-magic-bassy-flip", but
        # that should be taken by the rename above, so the fallback logic
        # should trigger making it go to "real-magic-bassy-flip-1"
        event_type, entry = get_new_agreement_event_dupe()
        agreement_record_dupe = lookup_agreement_record(
            update_task,
            session,
            entry,
            40,  # event agreement id
            block_number,
            updated_block_hash,
            "0x",  # txhash
        )

        entry_multihash = helpers.multihash_digest_to_cid(
            b"@\xfe\x1f\x02\xf3i%\xa5+\xec\x8dh\x82\xc5}"
            + b"\x17\x91\xb9\xa1\x8dg j\xc0\xcd\x879K\x80\xf2\xdbg"
        )
        agreement_metadata = update_task.cid_metadata_client.get_metadata(
            entry_multihash, "", ""
        )

        parse_agreement_event(
            None,
            session,
            update_task,
            entry,
            event_type,
            agreement_record_dupe,
            block_number,
            block_timestamp,
            agreement_metadata,
            pending_agreement_routes,
        )

        # Check that agreement routes are assigned appropriately
        agreement_routes = session.query(AgreementRoute).filter(AgreementRoute.agreement_id == 40).all()
        assert [
            route
            for route in agreement_routes
            if route.slug == "real-magic-bassy-flip-1"
            and route.collision_id == 1
            and route.is_current is True
            and route.title_slug == "real-magic-bassy-flip"
        ], "New route should be current and go to collision id 1"

        # Another "real-magic-bassy-flip", which should find collision id 1 and
        # easily jump to collision id 2, but then conflict with the rename above
        # and require the additional failsafe collision detection to go to collision id 3
        event_type, entry = get_new_agreement_event_dupe()

        agreement_record_dupe = lookup_agreement_record(
            update_task,
            session,
            entry,
            30,  # event agreement id
            block_number,
            updated_block_hash,
            "0x",  # txhash
        )

        parse_agreement_event(
            None,
            session,
            update_task,
            entry,
            event_type,
            agreement_record_dupe,
            block_number,
            block_timestamp,
            agreement_metadata,
            pending_agreement_routes,
        )

        # Check that agreement routes are assigned appropriately
        agreement_routes = session.query(AgreementRoute).filter(AgreementRoute.agreement_id == 30).all()
        assert [
            route
            for route in agreement_routes
            if route.is_current is True
            and route.title_slug == "real-magic-bassy-flip"
            and route.slug == "real-magic-bassy-flip-3"
            and route.collision_id == 3
        ], "New route should be current and go to collision id 3"

        # ================== Test Revert AgreementRoute ===================

        # Assert that there exists a previous record to revert to
        # that isn't marked as is_current
        agreement_route = (
            session.query(AgreementRoute)
            .filter(AgreementRoute.agreement_id == 1, AgreementRoute.is_current == False)
            .all()
        )
        assert agreement_route

        # Make sure the blocks are committed
        session.commit()
        pending_agreement_routes.clear()
        revert_blocks(mock_index_task, db, [second_block])
        # Commit the revert
        session.commit()

        agreement_routes = session.query(AgreementRoute).all()

        # That old route should now be marked as is_current
        assert [
            route
            for route in agreement_routes
            if route.is_current == True
            and route.agreement_id == 1
            and route.slug == "real-magic-bassy-flip"
        ], "Old route should be marked as current again"
        assert (
            len(
                [
                    route
                    for route in agreement_routes
                    if route.is_current == True and route.agreement_id == 1
                ]
            )
            == 1
        ), "Only one route should be marked as current"

        # ================== Test Delete Agreement Event ==================
        event_type, entry = get_delete_agreement_event()

        parse_agreement_event(
            None,  # self - not used
            session,
            update_task,  # only need the ipfs client for get_metadata
            entry,  # Contains the event args used for updating
            event_type,  # String that should one of user_event_types_lookup
            agreement_record,  # User ORM instance
            block_number,  # Used to forward to agreement uploads challenge
            block_timestamp,  # Used to update the user.updated_at field
            None,
            pending_agreement_routes,
        )

        # =================== Test agreement __repr___ ======================

        print(agreement_record)

        # updated_at should be updated every parse_agreement_event
        assert agreement_record.is_delete == True


def test_agreement_indexing_skip_tx(app, mocker):
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
    test_agreement_factory_txs = [cursed_tx, blessed_tx]
    test_timestamp = datetime.utcfromtimestamp(test_block_timestamp)
    blessed_agreement_record = Agreement(
        blockhash=test_block_hash,
        blocknumber=test_block_number,
        txhash=blessed_tx_hash,
        agreement_id=91232,
        is_unlisted=False,
        route_id="test",
        agreement_segments=[
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
    cursed_agreement_record = Agreement(
        blockhash=test_block_hash,
        blocknumber=test_block_number,
        txhash=cursed_tx_hash,
        agreement_id=91238,
        is_unlisted=None,
        is_current=True,
        is_delete=True,
        updated_at=test_timestamp,
        created_at=None,
    )

    mocker.patch(
        "src.tasks.agreements.lookup_agreement_record",
        side_effect=[cursed_agreement_record, blessed_agreement_record],
        autospec=True,
    )
    mocker.patch(
        "src.tasks.agreements.get_agreement_events_tx",
        side_effect=[
            [],  # no new agreement events
            [],
            [
                {
                    "args": AttrDict(
                        {
                            "_agreementId": cursed_agreement_record.agreement_id,
                        }
                    )
                },
            ],  # agreement deleted event
            [],  # second tx processing loop
            [],
            [
                {
                    "args": AttrDict(
                        {
                            "_agreementId": blessed_agreement_record.agreement_id,
                        }
                    )
                },
            ],  # agreement deleted event
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
            (total_changes, updated_agreement_ids_set) = agreement_state_update(
                update_task,
                update_task,
                session,
                test_agreement_factory_txs,
                test_block_number,
                test_block_timestamp,
                block_hash,
                test_ipfs_metadata,
            )
            assert len(updated_agreement_ids_set) == 1
            assert list(updated_agreement_ids_set)[0] == blessed_agreement_record.agreement_id
            assert total_changes == 1
            assert (
                session.query(SkippedTransaction)
                .filter(
                    SkippedTransaction.txhash == cursed_agreement_record.txhash,
                    SkippedTransaction.level == SkippedTransactionLevel.node,
                )
                .first()
            )
            assert (
                session.query(Agreement)
                .filter(Agreement.agreement_id == blessed_agreement_record.agreement_id)
                .first()
            )
            assert (
                session.query(Agreement)
                .filter(Agreement.agreement_id == cursed_agreement_record.agreement_id)
                .first()
            ) == None
        except Exception:
            assert False
