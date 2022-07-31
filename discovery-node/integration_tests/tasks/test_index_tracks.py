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
from src.models.tracks.track import Track
from src.models.tracks.track_route import TrackRoute
from src.models.users.user import User
from src.tasks.index import revert_blocks
from src.tasks.tracks import (
    lookup_track_record,
    parse_track_event,
    track_event_types_lookup,
    track_state_update,
)
from src.utils import helpers
from src.utils.db_session import get_db
from web3 import Web3

block_hash = b"0x8f19da326900d171642af08e6770eedd83509c6c44f6855c98e6a752844e2521"


def get_new_track_event():
    event_type = track_event_types_lookup["new_track"]
    new_track_event = AttrDict(
        {
            "_id": 1,
            "_trackOwnerId": 1,
            "_multihashDigest": b"@\xfe\x1f\x02\xf3i%\xa5+\xec\x8dh\x82\xc5}\x17"
            + b"\x91\xb9\xa1\x8dg j\xc0\xcd\x879K\x80\xf2\xdbg",
            "_multihashHashFn": 18,
            "_multihashSize": 32,
        }
    )
    return event_type, AttrDict({"blockHash": block_hash, "args": new_track_event})


def get_new_track_event_dupe():
    event_type = track_event_types_lookup["new_track"]
    new_track_event = AttrDict(
        {
            "_id": 2,
            "_trackOwnerId": 1,
            "_multihashDigest": b"@\xfe\x1f\x02\xf3i%\xa5+\xec\x8dh"
            + b"\x82\xc5}\x17\x91\xb9\xa1\x8dg j\xc0\xcd\x879K\x80\xf2\xdbg",
            "_multihashHashFn": 18,
            "_multihashSize": 32,
        }
    )
    return event_type, AttrDict({"blockHash": block_hash, "args": new_track_event})


def get_update_track_event():
    event_type = track_event_types_lookup["update_track"]
    update_track_event = AttrDict(
        {
            "_trackId": 1,
            "_trackOwnerId": 1,
            "_multihashDigest": b"\x93\x7f\xa2\xe6\xf0\xe5\xb5f\xca"
            + b"\x14(4m.B\xba3\xf8\xc8<|%*{\x11\xc1\xe2/\xd7\xee\xd7q",
            "_multihashHashFn": 18,
            "_multihashSize": 32,
        }
    )
    return event_type, AttrDict({"blockHash": block_hash, "args": update_track_event})


def get_delete_track_event():
    event_type = track_event_types_lookup["delete_track"]
    delete_track_event = AttrDict({"_trackId": 1})
    return event_type, AttrDict({"blockHash": block_hash, "args": delete_track_event})


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
            "track_segments": [
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
            "remix_of": {"tracks": [{"parent_track_id": 75808}]},
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
            "track_id": 77955,
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
            "track_segments": [
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
            "remix_of": {"tracks": [{"parent_track_id": 75808}]},
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
            "track_id": 77955,
            "stem_of": None,
        },
    }
)


# ========================================== Start Tests ==========================================
@patch("src.tasks.index")
def test_index_tracks(mock_index_task, app):
    """Tests that tracks are indexed correctly"""
    with app.app_context():
        db = get_db()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        web3 = Web3()
        update_task = UpdateTask(cid_metadata_client, web3, challenge_event_bus)

    pending_track_routes = []

    with db.scoped_session() as session, challenge_event_bus.use_scoped_dispatch_queue():
        # ================== Test New Track Event ==================
        event_type, entry = get_new_track_event()

        block_number = random.randint(1, 10000)
        block_timestamp = 1585336422
        updated_block_hash = f"0x{block_number}"

        # Some sqlalchemy user instance
        track_record = lookup_track_record(
            update_task,
            session,
            entry,
            1,  # event track id
            block_number,
            updated_block_hash,
            "0x",  # txhash
        )

        assert track_record.updated_at == None

        # Fields set to defaults
        assert track_record.created_at == None
        assert track_record.owner_id == None
        assert track_record.is_delete == False

        # Create track's owner user before
        block = Block(
            blockhash=updated_block_hash, number=block_number, is_current=True
        )
        session.add(block)
        session.flush()

        track_owner = User(
            is_current=True,
            user_id=entry.args._trackOwnerId,
            handle="ray",
            blockhash=updated_block_hash,
            blocknumber=block_number,
            creator_node_endpoint=(
                "http://cn2_network-node_1:4001,http://cn1_network-node_1:4000,"
                "http://cn3_network-node_1:4002"
            ),
            created_at=datetime.utcfromtimestamp(block_timestamp),
            updated_at=datetime.utcfromtimestamp(block_timestamp),
        )
        session.add(track_owner)

        entry_multihash = helpers.multihash_digest_to_cid(
            b"@\xfe\x1f\x02\xf3i%\xa5+\xec\x8dh\x82\xc5}"
            + b"\x17\x91\xb9\xa1\x8dg j\xc0\xcd\x879K\x80\xf2\xdbg"
        )
        track_metadata = update_task.cid_metadata_client.get_metadata(
            entry_multihash, "", ""
        )

        track_record = parse_track_event(
            None,  # self - not used
            session,
            update_task,  # only need the ipfs client for get_metadata
            entry,  # Contains the event args used for updating
            event_type,  # String that should one of user_event_types_lookup
            track_record,  # User ORM instance
            block_number,  # Used to forward to track uploads challenge
            block_timestamp,  # Used to update the user.updated_at field
            track_metadata,
            pending_track_routes,
        )
        session.add(track_record)

        # updated_at should be updated every parse_track_event
        assert track_record.updated_at == datetime.utcfromtimestamp(block_timestamp)

        # new_track updated fields
        assert track_record.created_at == datetime.utcfromtimestamp(block_timestamp)
        assert track_record.owner_id == entry.args._trackOwnerId
        assert track_record.is_delete == False

        assert track_record.title == track_metadata["title"]
        assert track_record.length == 0
        assert track_record.cover_art == None
        assert track_record.cover_art_sizes == track_metadata["cover_art_sizes"]
        assert track_record.tags == track_metadata["tags"]
        assert track_record.genre == track_metadata["genre"]
        assert track_record.mood == track_metadata["mood"]
        assert track_record.credits_splits == track_metadata["credits_splits"]
        assert track_record.create_date == track_metadata["create_date"]
        assert track_record.release_date == track_metadata["release_date"]
        assert track_record.file_type == track_metadata["file_type"]
        assert track_record.description == track_metadata["description"]
        assert track_record.license == track_metadata["license"]
        assert track_record.isrc == track_metadata["isrc"]
        assert track_record.iswc == track_metadata["iswc"]
        assert track_record.track_segments == track_metadata["track_segments"]
        assert track_record.is_unlisted == track_metadata["is_unlisted"]
        assert track_record.field_visibility == track_metadata["field_visibility"]
        assert track_record.remix_of == track_metadata["remix_of"]
        assert track_record.download == {
            "is_downloadable": track_metadata["download"].get("is_downloadable")
            == True,
            "requires_follow": track_metadata["download"].get("requires_follow")
            == True,
            "cid": track_metadata["download"].get("cid", None),
        }

        # ================== Test Update Track Event ==================
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

        # Refresh the track record
        track_record = lookup_track_record(
            update_task,
            session,
            entry,
            1,  # event track id
            block_number,
            updated_block_hash,
            "0x",  # txhash
        )

        event_type, entry = get_update_track_event()

        entry_multihash = helpers.multihash_digest_to_cid(
            b"\x93\x7f\xa2\xe6\xf0\xe5\xb5f\xca\x14(4m.B"
            + b"\xba3\xf8\xc8<|%*{\x11\xc1\xe2/\xd7\xee\xd7q"
        )
        track_metadata = update_task.cid_metadata_client.get_metadata(
            entry_multihash, "", ""
        )

        parse_track_event(
            None,
            session,
            update_task,
            entry,
            event_type,
            track_record,
            block_number,
            block_timestamp,
            track_metadata,
            pending_track_routes,
        )

        # Check that track routes are updated appropriately
        track_routes = session.query(TrackRoute).filter(TrackRoute.track_id == 1).all()
        # Should have the two routes created on track creation as well as two more for the update
        assert len(track_routes) == 2, "Has two total routes after a track name update"
        assert (
            len(
                [
                    route
                    for route in track_routes
                    if route.is_current is True
                    and route.slug == "real-magic-bassy-flip-2"
                ]
            )
            == 1
        ), "The current route is 'real-magic-bassy-flip-2'"
        assert (
            len([route for route in track_routes if route.is_current is False]) == 1
        ), "One route is marked non-current"
        assert (
            len(
                [
                    route
                    for route in track_routes
                    if route.slug
                    in ("real-magic-bassy-flip-2", "real-magic-bassy-flip")
                ]
            )
            == 2
        ), "Has both of the 'new-style' routes"

        # ============== Test Track Route Collisions ===================

        # Attempts to insert a new track with the route "real-magic-bassy-flip"
        # Should attempt to try to route to "real-magic-bassy-flip", but
        # that should be taken by the rename above, so the fallback logic
        # should trigger making it go to "real-magic-bassy-flip-1"
        event_type, entry = get_new_track_event_dupe()
        track_record_dupe = lookup_track_record(
            update_task,
            session,
            entry,
            40,  # event track id
            block_number,
            updated_block_hash,
            "0x",  # txhash
        )

        entry_multihash = helpers.multihash_digest_to_cid(
            b"@\xfe\x1f\x02\xf3i%\xa5+\xec\x8dh\x82\xc5}"
            + b"\x17\x91\xb9\xa1\x8dg j\xc0\xcd\x879K\x80\xf2\xdbg"
        )
        track_metadata = update_task.cid_metadata_client.get_metadata(
            entry_multihash, "", ""
        )

        parse_track_event(
            None,
            session,
            update_task,
            entry,
            event_type,
            track_record_dupe,
            block_number,
            block_timestamp,
            track_metadata,
            pending_track_routes,
        )

        # Check that track routes are assigned appropriately
        track_routes = session.query(TrackRoute).filter(TrackRoute.track_id == 40).all()
        assert [
            route
            for route in track_routes
            if route.slug == "real-magic-bassy-flip-1"
            and route.collision_id == 1
            and route.is_current is True
            and route.title_slug == "real-magic-bassy-flip"
        ], "New route should be current and go to collision id 1"

        # Another "real-magic-bassy-flip", which should find collision id 1 and
        # easily jump to collision id 2, but then conflict with the rename above
        # and require the additional failsafe collision detection to go to collision id 3
        event_type, entry = get_new_track_event_dupe()

        track_record_dupe = lookup_track_record(
            update_task,
            session,
            entry,
            30,  # event track id
            block_number,
            updated_block_hash,
            "0x",  # txhash
        )

        parse_track_event(
            None,
            session,
            update_task,
            entry,
            event_type,
            track_record_dupe,
            block_number,
            block_timestamp,
            track_metadata,
            pending_track_routes,
        )

        # Check that track routes are assigned appropriately
        track_routes = session.query(TrackRoute).filter(TrackRoute.track_id == 30).all()
        assert [
            route
            for route in track_routes
            if route.is_current is True
            and route.title_slug == "real-magic-bassy-flip"
            and route.slug == "real-magic-bassy-flip-3"
            and route.collision_id == 3
        ], "New route should be current and go to collision id 3"

        # ================== Test Revert TrackRoute ===================

        # Assert that there exists a previous record to revert to
        # that isn't marked as is_current
        track_route = (
            session.query(TrackRoute)
            .filter(TrackRoute.track_id == 1, TrackRoute.is_current == False)
            .all()
        )
        assert track_route

        # Make sure the blocks are committed
        session.commit()
        pending_track_routes.clear()
        revert_blocks(mock_index_task, db, [second_block])
        # Commit the revert
        session.commit()

        track_routes = session.query(TrackRoute).all()

        # That old route should now be marked as is_current
        assert [
            route
            for route in track_routes
            if route.is_current == True
            and route.track_id == 1
            and route.slug == "real-magic-bassy-flip"
        ], "Old route should be marked as current again"
        assert (
            len(
                [
                    route
                    for route in track_routes
                    if route.is_current == True and route.track_id == 1
                ]
            )
            == 1
        ), "Only one route should be marked as current"

        # ================== Test Delete Track Event ==================
        event_type, entry = get_delete_track_event()

        parse_track_event(
            None,  # self - not used
            session,
            update_task,  # only need the ipfs client for get_metadata
            entry,  # Contains the event args used for updating
            event_type,  # String that should one of user_event_types_lookup
            track_record,  # User ORM instance
            block_number,  # Used to forward to track uploads challenge
            block_timestamp,  # Used to update the user.updated_at field
            None,
            pending_track_routes,
        )

        # =================== Test track __repr___ ======================

        print(track_record)

        # updated_at should be updated every parse_track_event
        assert track_record.is_delete == True


def test_track_indexing_skip_tx(app, mocker):
    """Tests that tracks skip cursed txs without throwing an error and are able to process other tx in block"""
    with app.app_context():
        db = get_db()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        web3 = Web3()
        update_task = UpdateTask(cid_metadata_client, web3, challenge_event_bus)

    class TestTrackTransaction:
        pass

    blessed_tx_hash = (
        "0x34004dfaf5bb7cf9998eaf387b877d72d198c6508608e309df3f89e57def4db3"
    )
    blessed_tx = TestTrackTransaction()
    blessed_tx.transactionHash = update_task.web3.toBytes(hexstr=blessed_tx_hash)
    cursed_tx_hash = (
        "0x5fe51d735309d3044ae30055ad29101018a1a399066f6c53ea23800225e3a3be"
    )
    cursed_tx = TestTrackTransaction()
    cursed_tx.transactionHash = update_task.web3.toBytes(hexstr=cursed_tx_hash)
    test_block_number = 25278765
    test_block_timestamp = 1
    test_block_hash = update_task.web3.toHex(block_hash)
    test_track_factory_txs = [cursed_tx, blessed_tx]
    test_timestamp = datetime.utcfromtimestamp(test_block_timestamp)
    blessed_track_record = Track(
        blockhash=test_block_hash,
        blocknumber=test_block_number,
        txhash=blessed_tx_hash,
        track_id=91232,
        is_unlisted=False,
        route_id="test",
        track_segments=[
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
    cursed_track_record = Track(
        blockhash=test_block_hash,
        blocknumber=test_block_number,
        txhash=cursed_tx_hash,
        track_id=91238,
        is_unlisted=None,
        is_current=True,
        is_delete=True,
        updated_at=test_timestamp,
        created_at=None,
    )

    mocker.patch(
        "src.tasks.tracks.lookup_track_record",
        side_effect=[cursed_track_record, blessed_track_record],
        autospec=True,
    )
    mocker.patch(
        "src.tasks.tracks.get_track_events_tx",
        side_effect=[
            [],  # no new track events
            [],
            [
                {
                    "args": AttrDict(
                        {
                            "_trackId": cursed_track_record.track_id,
                        }
                    )
                },
            ],  # track deleted event
            [],  # second tx processing loop
            [],
            [
                {
                    "args": AttrDict(
                        {
                            "_trackId": blessed_track_record.track_id,
                        }
                    )
                },
            ],  # track deleted event
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
            (total_changes, updated_track_ids_set) = track_state_update(
                update_task,
                update_task,
                session,
                test_track_factory_txs,
                test_block_number,
                test_block_timestamp,
                block_hash,
                test_ipfs_metadata,
            )
            assert len(updated_track_ids_set) == 1
            assert list(updated_track_ids_set)[0] == blessed_track_record.track_id
            assert total_changes == 1
            assert (
                session.query(SkippedTransaction)
                .filter(
                    SkippedTransaction.txhash == cursed_track_record.txhash,
                    SkippedTransaction.level == SkippedTransactionLevel.node,
                )
                .first()
            )
            assert (
                session.query(Track)
                .filter(Track.track_id == blessed_track_record.track_id)
                .first()
            )
            assert (
                session.query(Track)
                .filter(Track.track_id == cursed_track_record.track_id)
                .first()
            ) == None
        except Exception:
            assert False
