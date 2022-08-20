from datetime import datetime
from typing import Any, Dict
from unittest import mock

from integration_tests.challenges.index_helpers import AttrDict, CIDMetadataClient
from src.challenges.challenge_event import ChallengeEvent
from src.database_task import DatabaseTask
from src.models.indexing.block import Block
from src.models.indexing.skipped_transaction import (
    SkippedTransaction,
    SkippedTransactionLevel,
)
from src.models.users.associated_wallet import AssociatedWallet
from src.models.users.user import User
from src.models.users.user_events import UserEvent
from src.tasks.metadata import user_metadata_format
from src.tasks.users import (
    UserEventMetadata,
    lookup_user_record,
    parse_user_event,
    update_user_events,
    user_state_update,
)
from src.utils import helpers
from src.utils.db_session import get_db
from src.utils.redis_connection import get_redis
from src.utils.user_event_constants import user_event_types_lookup
from web3 import Web3

block_hash = b"0x8f19da326900d171642af08e6770eedd83509c6c44f6855c98e6a752844e2521"


def get_add_user_event():
    event_type = user_event_types_lookup["add_user"]
    add_user_event = AttrDict(
        {
            "_userId": 1,
            "_handle": b"joe\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00",
            "_wallet": "0x82Fc85A842c9922A9Db9091Cf6573754Cd2D0F14",
        }
    )
    return event_type, AttrDict({"blockHash": block_hash, "args": add_user_event})


def get_update_bio_event():
    event_type = user_event_types_lookup["update_bio"]
    update_bio_event = AttrDict({"_userId": 1, "_bio": "change description"})
    return event_type, AttrDict({"blockHash": block_hash, "args": update_bio_event})


def get_update_multihash_event():
    event_type = user_event_types_lookup["update_multihash"]
    update_multihash_event = AttrDict(
        {
            "_userId": 1,
            "_multihashDigest": b"\x94uU\x06@\xa2\x93\xf1$d:\xe8m|rj\x02y\x93\xdf\x9bf?\xe7h\xb3y\xa6\x19\x0c\x81\xb0",
        }
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": update_multihash_event}
    )


def get_update_location_event():
    event_type = user_event_types_lookup["update_location"]
    update_location_event = AttrDict(
        {
            "_userId": 1,
            "_location": b"location\x00\x00\x00\x00\x00\x00\x00\x00\x00"
            + b"\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00",
        }
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": update_location_event}
    )


def get_update_profile_photo_event():
    event_type = user_event_types_lookup["update_profile_photo"]
    update_profile_photo_event = AttrDict(
        {
            "_userId": 1,
            "_profilePhotoDigest": b"\xc6\x0f\xc2@\x8f\xd1\xb7R\xbb\xe3\xf6\xc3"
            + b"\xa45\x19\x9d\xc6\x10g\x8dm\xe4\x15\x86|\x91\\r\xaa\x01\xab-",
        }
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": update_profile_photo_event}
    )


def get_update_cover_photo_event():
    event_type = user_event_types_lookup["update_cover_photo"]
    update_cover_photo_event = AttrDict(
        {
            "_userId": 1,
            "_coverPhotoDigest": b"C\x9a\r\xa5PO\x99\x8c\xdf;\x8cT\xdc\x18\xf5**\x80"
            + b"\x01\xe3j-\xd7\x11_\x84\xde%T\xd0\xcd\xc6",
        }
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": update_cover_photo_event}
    )


def get_update_name_event():
    event_type = user_event_types_lookup["update_name"]
    update_name_event = AttrDict(
        {
            "_userId": 1,
            "_name": b"joey\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
            + b"\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00",
        }
    )
    return event_type, AttrDict({"blockHash": block_hash, "args": update_name_event})


def get_update_content_node_endpoint_event():
    event_type = user_event_types_lookup["update_content_node_endpoint"]
    update_content_node_endpoint_event = AttrDict(
        {
            "_userId": 1,
            "_contentNodeEndpoint": "http://cn2_content-node_1:4001,http://cn1_content-node_1:4000,"
            + "http://cn3_content-node_1:4002",
        }
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": update_content_node_endpoint_event}
    )


# 'update_is_verified': 'UpdateIsVerified',
multihash = helpers.multihash_digest_to_cid(
    b"\x94uU\x06@\xa2\x93\xf1$d:\xe8m|rj\x02y"
    + b"\x93\xdf\x9bf?\xe7h\xb3y\xa6\x19\x0c\x81\xb0"
)

cid_metadata_client = CIDMetadataClient(
    {
        multihash: {
            "is_verified": False,
            "name": "raymont",
            "handle": "rayjacobson",
            "profile_picture": None,
            "profile_picture_sizes": "Qmdad2B9JPnJ9duZgfD5mVNDwKZUTNoqZp8xdDB9bmcewk",
            "cover_photo": None,
            "cover_photo_sizes": "QmQnJ8uXf886crAticzPGgrfqxq68kAxBXXcK73geFakUo",
            "bio": "ðŸŒ\n;",
            "location": "chik fil yay!",
            "content_node_endpoint": "https://creatornode2.coliving.lol,https://creatornode.coliving.lol,"
            + "https://content-node.coliving.lol",
            "associated_wallets": {
                "0xEfFe2E2Dfc7945ED6Fd4C07c0B668589C52819BF": {
                    "signature": "0xdde72a90dad4a0027ca87630a2b5615240d9ad545f2fc50e24952a2b4f2c5a"
                    + "f76c96b9e06df5801d3e3374e247b799ac3e6dfd22b4df117fe1d6190789c5bb781b"
                },
                "0x0aDd827a4d1ad41c4D4612B4f1Df84b9d9654782": {
                    "signature": "0xd13fc25e87dac94ba95af9e352111816aa25c1dc7ff48437660e2350a4f7a6f"
                    + "413011759fa6980ba5f55b0fc66d55122afd5497b5795992cf6749bbe06553abc1b"
                },
            },
            "associated_sol_wallets": {
                "A5PXrbJdeyqfJRqunnqdCfvuy3LD21Sh2D1SL1a48bkp": {
                    "signature": "5953cc8f46a564e09b98fb70b0b4d5afe99875955124487e958e2d68f8f5e70923"
                    + "ab01e0c59f576bba996cfa8945be48e54bb0f177aed782d022133a472cd501"
                },
            },
            "collectibles": {
                "73:::0x417cf58dc18edd17025689d13af2b85f403e130c": {},
                "order": ["73:::0x417cf58dc18edd17025689d13af2b85f403e130c"],
            },
            "content list_library": {
                "contents": [
                    {
                        "type": "folder",
                        "name": "my favorite content lists",
                        "contents": [
                            {"type": "content list", "content list_id": 500},
                            {
                                "type": "explore_content list",
                                "content list_id": "heavy-rotation",
                            },
                        ],
                    },
                    {"type": "content list", "content list_id": 501},
                    {"type": "content list", "content list_id": 502},
                    {"type": "explore_content list", "content list_id": "feeling-lucky"},
                    {"type": "content list", "content list_id": 503},
                ]
            },
            "events": {
                "referrer": 2,
                "is_mobile_user": True,
            },
            "user_id": 1,
            "is_deactivated": True,
        }
    }
)


@mock.patch("src.challenges.challenge_event_bus.ChallengeEventBus", autospec=True)
def test_index_users(bus_mock: mock.MagicMock, app):
    """Tests that users are indexed correctly"""
    with app.app_context():
        db = get_db()
        redis = get_redis()
        web3 = Web3()
        bus_mock(redis)
        update_task = DatabaseTask(
            cid_metadata_client=cid_metadata_client,
            web3=web3,
            challenge_event_bus=bus_mock,
            redis=redis,
        )

    with db.scoped_session() as session, bus_mock.use_scoped_dispatch_queue():
        # ================== Test Add User Event ==================
        event_type, entry = get_add_user_event()

        block_number = 1
        block_timestamp = 1585336422

        # Some sqlalchemy user instance
        user_record = lookup_user_record(
            update_task, session, entry, block_number, block_timestamp, "0x"  # txhash
        )

        assert user_record.updated_at == None

        # Fields set to None by default
        assert user_record.handle == None
        assert user_record.handle_lc == None
        assert user_record.wallet == None

        parse_user_event(
            None,  # self - not used
            update_task,  # only need the ipfs client for get_metadata
            session,
            None,  # tx_receipt - not used
            block_number,  # not used
            entry,  # Contains the event args used for updating
            event_type,  # String that should one of user_event_types_lookup
            user_record,  # User ORM instance
            None,  # ipfs_metadata - not used
            block_timestamp,  # Used to update the user.updated_at field
        )

        # updated_at should be updated every parse_user_event
        assert user_record.updated_at == datetime.utcfromtimestamp(block_timestamp)

        # add_user should be updated fields: handle, handle_lc, wallet
        assert user_record.handle == helpers.bytes32_to_str(entry.args._handle)
        assert (
            user_record.handle_lc == helpers.bytes32_to_str(entry.args._handle).lower()
        )
        assert user_record.wallet == entry.args._wallet.lower()

        # ================== Test Update User Bio Event ==================
        event_type, entry = get_update_bio_event()

        assert user_record.bio == None
        assert user_record.handle != None

        parse_user_event(
            None,  # self - not used
            update_task,  # only need the ipfs client for get_metadata
            session,
            None,  # tx_receipt - not used
            block_number,  # not used
            entry,  # Contains the event args used for updating
            event_type,  # String that should one of user_event_types_lookup
            user_record,  # User ORM instance
            None,  # ipfs_metadata - not used
            block_timestamp,  # Used to update the user.updated_at field
        )

        # add_user should be updated fields: handle, handle_lc, wallet
        assert user_record.bio == entry.args._bio

        # ================== Test Update User Location Event ==================
        event_type, entry = get_update_location_event()

        # `location` field is none by default
        assert user_record.location == None

        parse_user_event(
            None,  # self - not used
            update_task,  # only need the ipfs client for get_metadata
            session,
            None,  # tx_receipt - not used
            block_number,  # not used
            entry,  # Contains the event args used for updating
            event_type,  # String that should one of user_event_types_lookup
            user_record,  # User ORM instance
            None,  # ipfs_metadata - not used
            block_timestamp,  # Used to update the user.updated_at field
        )

        # add_user should be updated fields: handle, handle_lc, wallet
        assert user_record.location == helpers.bytes32_to_str(entry.args._location)

        # ================== Test Update User Name Event ==================
        event_type, entry = get_update_name_event()

        # `name` field is none by default
        assert user_record.name == None

        parse_user_event(
            None,  # self - not used
            update_task,  # only need the ipfs client for get_metadata
            session,
            None,  # tx_receipt - not used
            block_number,  # not used
            entry,  # Contains the event args used for updating
            event_type,  # String that should one of user_event_types_lookup
            user_record,  # User ORM instance
            None,  # ipfs_metadata - not used
            block_timestamp,  # Used to update the user.updated_at field
        )

        # add_user should be updated fields: handle, handle_lc, wallet
        assert user_record.name == helpers.bytes32_to_str(entry.args._name)

        # ================== Test Update User CNodes Event for legacy ==================
        event_type, entry = get_update_content_node_endpoint_event()

        # `content_node_endpoint` field is none by default
        assert user_record.content_node_endpoint == None

        # Set primary id so that content node endpoints is not set
        assert user_record.primary_id == None
        user_record.primary_id = 1

        parse_user_event(
            None,  # self - not used
            update_task,  # only need the ipfs client for get_metadata
            session,
            None,  # tx_receipt - not used
            block_number,  # not used
            entry,  # Contains the event args used for updating
            event_type,  # String that should one of user_event_types_lookup
            user_record,  # User ORM instance
            None,  # ipfs_metadata - not used
            block_timestamp,  # Used to update the user.updated_at field
        )

        # add_user should be updated fields: handle, handle_lc, wallet
        assert user_record.content_node_endpoint == None

        # Set primary id back to none
        user_record.primary_id = None

        # ================== Test Update User CNodes Event ==================
        event_type, entry = get_update_content_node_endpoint_event()

        # `content_node_endpoint` field is none by default
        assert user_record.content_node_endpoint == None

        parse_user_event(
            None,  # self - not used
            update_task,  # only need the ipfs client for get_metadata
            session,
            None,  # tx_receipt - not used
            block_number,  # not used
            entry,  # Contains the event args used for updating
            event_type,  # String that should one of user_event_types_lookup
            user_record,  # User ORM instance
            None,  # ipfs_metadata - not used
            block_timestamp,  # Used to update the user.updated_at field
        )

        # add_user should be updated fields: handle, handle_lc, wallet
        assert user_record.content_node_endpoint == entry.args._contentNodeEndpoint

        # ================== Test Update User Profile Photo Event ==================
        event_type, entry = get_update_profile_photo_event()

        # `profile_picture` field is none by default
        assert user_record.profile_picture == None
        assert user_record.profile_picture_sizes == None

        parse_user_event(
            None,  # self - not used
            update_task,  # only need the ipfs client for get_metadata
            session,
            None,  # tx_receipt - not used
            block_number,  # not used
            entry,  # Contains the event args used for updating
            event_type,  # String that should one of user_event_types_lookup
            user_record,  # User ORM instance
            None,  # ipfs_metadata - not used
            block_timestamp,  # Used to update the user.updated_at field
        )

        # add_user should be updated fields: profile_picture_sizes, profile_picture
        assert user_record.profile_picture_sizes == helpers.multihash_digest_to_cid(
            entry.args._profilePhotoDigest
        )
        assert user_record.profile_picture == None

        # ================== Test Update User Cover Photo Event ==================
        event_type, entry = get_update_cover_photo_event()

        # `cover_photo` field is none by default
        assert user_record.cover_photo == None
        assert user_record.cover_photo_sizes == None

        parse_user_event(
            None,  # self - not used
            update_task,  # only need the ipfs client for get_metadata
            session,
            None,  # tx_receipt - not used
            block_number,  # not used
            entry,  # Contains the event args used for updating
            event_type,  # String that should one of user_event_types_lookup
            user_record,  # User ORM instance
            None,  # ipfs_metadata - not used
            block_timestamp,  # Used to update the user.updated_at field
        )

        # add_user should be updated fields: cover_photo, cover_photo_sizes
        assert user_record.cover_photo == None
        assert user_record.cover_photo_sizes == helpers.multihash_digest_to_cid(
            entry.args._coverPhotoDigest
        )

        # ================== Test Update User Metadata Event ==================
        event_type, entry = get_update_multihash_event()

        parse_user_event(
            None,  # self - not used
            update_task,  # only need the ipfs client for get_metadata
            session,
            None,  # tx_receipt - not used
            block_number,  # not used
            entry,  # Contains the event args used for updating
            event_type,  # String that should one of user_event_types_lookup
            user_record,  # User ORM instance
            update_task.cid_metadata_client.get_metadata(
                helpers.multihash_digest_to_cid(entry.args._multihashDigest),
                user_metadata_format,
                "",
            ),  # ipfs_metadata
            block_timestamp,  # Used to update the user.updated_at field
        )
        session.flush()

        entry_multihash = helpers.multihash_digest_to_cid(entry.args._multihashDigest)
        ipfs_metadata = update_task.cid_metadata_client.get_metadata(
            entry_multihash, "", ""
        )

        assert user_record.profile_picture == ipfs_metadata["profile_picture"]
        assert user_record.cover_photo == ipfs_metadata["cover_photo"]
        assert user_record.bio == ipfs_metadata["bio"]
        assert user_record.name == ipfs_metadata["name"]
        assert user_record.location == ipfs_metadata["location"]
        assert (
            user_record.profile_picture_sizes == ipfs_metadata["profile_picture_sizes"]
        )
        assert user_record.cover_photo_sizes == ipfs_metadata["cover_photo_sizes"]
        assert user_record.has_collectibles == True
        assert user_record.content list_library == ipfs_metadata["content list_library"]

        assert user_record.is_deactivated == True

        ipfs_associated_wallets = ipfs_metadata["associated_wallets"]
        associated_wallets = (
            session.query(AssociatedWallet)
            .filter_by(
                user_id=user_record.user_id,
                is_current=True,
                is_delete=False,
                chain="eth",
            )
            .all()
        )
        for associated_wallet in associated_wallets:
            assert associated_wallet.wallet in ipfs_associated_wallets
        assert len(associated_wallets) == len(ipfs_associated_wallets)

        ipfs_associated_sol_wallets = ipfs_metadata["associated_sol_wallets"]
        associated_sol_wallets = (
            session.query(AssociatedWallet)
            .filter_by(
                user_id=user_record.user_id,
                is_current=True,
                is_delete=False,
                chain="sol",
            )
            .all()
        )
        for associated_wallet in associated_sol_wallets:
            assert associated_wallet.wallet in ipfs_associated_sol_wallets
        assert len(associated_sol_wallets) == len(ipfs_associated_sol_wallets)

        user_events = (
            session.query(UserEvent)
            .filter_by(user_id=user_record.user_id, is_current=True)
            .first()
        )
        assert user_events.referrer == 2
        assert user_events.is_mobile_user == True
        calls = [
            mock.call.dispatch(ChallengeEvent.mobile_install, 1, 1),
            mock.call.dispatch(ChallengeEvent.referred_signup, 1, 1),
            mock.call.dispatch(
                ChallengeEvent.referral_signup, 1, 2, {"referred_user_id": 1}
            ),
        ]
        bus_mock.assert_has_calls(calls, any_order=True)


@mock.patch("src.challenges.challenge_event_bus.ChallengeEventBus", autospec=True)
def test_self_referrals(bus_mock: mock.MagicMock, app):
    """Test that users can't refer themselves"""
    with app.app_context():
        db = get_db()
        redis = get_redis()
        bus_mock(redis)
    with db.scoped_session() as session, bus_mock.use_scoped_dispatch_queue():
        user = User(user_id=1, blockhash=str(block_hash), blocknumber=1)
        events: UserEventMetadata = {"referrer": 1}
        update_user_events(session, user, events, bus_mock)
        mock_call = mock.call.dispatch(
            ChallengeEvent.referral_signup, 1, 1, {"referred_user_id": 1}
        )
        assert mock_call not in bus_mock.method_calls


@mock.patch("src.challenges.challenge_event_bus.ChallengeEventBus", autospec=True)
def test_user_indexing_skip_tx(bus_mock: mock.MagicMock, app, mocker):
    """Tests that users skip cursed txs without throwing an error and are able to process other tx in block"""
    with app.app_context():
        db = get_db()
        redis = get_redis()
        web3 = Web3()
        bus_mock(redis)
        update_task = DatabaseTask(
            cid_metadata_client=cid_metadata_client,
            web3=web3,
            challenge_event_bus=bus_mock,
            redis=redis,
        )

    class TestUserTransaction:
        def __init__(self):
            self.transactionHash = None

        pass

    blessed_tx_hash = (
        "0x34004dfaf5bb7cf9998eaf387b877d72d198c6508608e309df3f89e57def4db3"
    )
    blessed_tx = TestUserTransaction()
    blessed_tx.transactionHash = update_task.web3.toBytes(hexstr=blessed_tx_hash)
    cursed_tx_hash = (
        "0x5fe51d735309d3044ae30055ad29101018a1a399066f6c53ea23800225e3a3be"
    )
    cursed_tx = TestUserTransaction()
    cursed_tx.transactionHash = update_task.web3.toBytes(hexstr=cursed_tx_hash)
    test_block_number = 25278765
    test_block_timestamp = 1
    test_block_hash = update_task.web3.toHex(block_hash)
    test_user_factory_txs = [cursed_tx, blessed_tx]
    test_timestamp = datetime.utcfromtimestamp(test_block_timestamp)
    blessed_user_record = User(
        blockhash=test_block_hash,
        blocknumber=test_block_number,
        txhash=blessed_tx_hash,
        user_id=91232,
        name="tobey maguire",
        is_current=True,
        updated_at=test_timestamp,
        created_at=test_timestamp,
    )
    cursed_user_record = User(
        blockhash=test_block_hash,
        blocknumber=test_block_number,
        txhash=cursed_tx_hash,
        user_id=91238,
        name="birbs",
        # Bad fields
        is_current=None,  # type: ignore
        updated_at=None,  # type: ignore
        created_at=None,  # type: ignore
    )

    mocker.patch(
        "src.tasks.users.lookup_user_record",
        side_effect=[cursed_user_record, blessed_user_record],
        autospec=True,
    )
    mocker.patch(
        "src.tasks.users.get_user_events_tx",
        side_effect=[
            [],  # no user added events
            [],
            [
                {
                    "args": AttrDict(
                        {
                            "_userId": cursed_user_record.user_id,
                            "_name": (cursed_user_record.name or "").encode("utf-8"),
                        }
                    )
                },
            ],  # update name event
            [],
            [],
            [],
            [],
            [],
            [],
            [],  # second tx receipt
            [],
            [
                {
                    "args": AttrDict(
                        {
                            "_userId": blessed_user_record.user_id,
                            "_name": (blessed_user_record.name or "").encode("utf-8"),
                        }
                    )
                },
            ],  # update name event
            [],
            [],
            [],
            [],
            [],
            [],
        ],
        autospec=True,
    )
    test_ipfs_metadata: Dict[str, Any] = {}

    with db.scoped_session() as session, bus_mock.use_scoped_dispatch_queue():
        try:
            current_block = Block(
                blockhash=test_block_hash,
                parenthash=test_block_hash,
                number=test_block_number,
                is_current=True,
            )
            session.add(current_block)
            (total_changes, updated_user_ids_set) = user_state_update(
                update_task,
                update_task,
                session,
                test_user_factory_txs,
                test_block_number,
                test_block_timestamp,
                block_hash,
                test_ipfs_metadata,
            )
            assert len(updated_user_ids_set) == 1
            assert list(updated_user_ids_set)[0] == blessed_user_record.user_id
            assert total_changes == 1
            assert (
                session.query(SkippedTransaction)
                .filter(
                    SkippedTransaction.txhash == cursed_user_record.txhash,
                    SkippedTransaction.level == SkippedTransactionLevel.node,
                )
                .first()
            )
            assert (
                session.query(User)
                .filter(User.user_id == blessed_user_record.user_id)
                .first()
            )
            assert (
                session.query(User)
                .filter(User.user_id == cursed_user_record.user_id)
                .first()
            ) == None
        except Exception:
            assert False
