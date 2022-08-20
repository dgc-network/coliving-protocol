import random
from datetime import datetime

from integration_tests.challenges.index_helpers import (
    AttrDict,
    CIDMetadataClient,
    UpdateTask,
)
from src.challenges.challenge_event_bus import setup_challenge_bus
from src.models.indexing.block import Block
from src.models.indexing.skipped_transaction import (
    SkippedTransaction,
    SkippedTransactionLevel,
)
from src.models.content lists.content list import ContentList
from src.tasks.content lists import (
    lookup_content list_record,
    parse_content list_event,
    content list_state_update,
)
from src.utils import helpers
from src.utils.db_session import get_db
from src.utils.content list_event_constants import content list_event_types_lookup
from web3 import Web3

block_hash = b"0x8f19da326900d171642af08e6770eedd83509c6c44f6855c98e6a752844e2521"


# event_type: ContentListCreated
def get_content list_created_event():
    event_type = content list_event_types_lookup["content list_created"]
    content list_created_event = AttrDict(
        {
            "_content listId": 1,
            "_content listOwnerId": 1,
            "_isPrivate": True,
            "_isAlbum": False,
            "_agreementIds": [],  # This is a list of numbers (agreement ids)
        }
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content list_created_event}
    )


# event_type: ContentListNameUpdated
def get_content list_name_updated_event():
    event_type = content list_event_types_lookup["content list_name_updated"]
    content list_name_updated_event = AttrDict(
        {"_content listId": 1, "_updatedContentListName": "asdfg"}
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content list_name_updated_event}
    )


# event_type: ContentListCoverPhotoUpdated
def get_content list_cover_photo_updated_event():
    event_type = content list_event_types_lookup["content list_cover_photo_updated"]
    content list_cover_photo_updated_event = AttrDict(
        {
            "_content listId": 1,
            "_content listImageMultihashDigest": b"\xad\x8d\x1eeG\xf2\x12\xe3\x817"
            + b"\x7f\xb1A\xc6 M~\xfe\x03F\x98f\xab\xfa3\x17ib\xdcC>\xed",
        }
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content list_cover_photo_updated_event}
    )


# event_type: ContentListDescriptionUpdated
def get_content list_description_updated_event():
    event_type = content list_event_types_lookup["content list_description_updated"]
    content list_description_updated_event = AttrDict(
        {"_content listId": 1, "_content listDescription": "adf"}
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content list_description_updated_event}
    )


# event_type: ContentListAgreementAdded
def get_content list_agreement_added_event(content listId, addedAgreementId):
    event_type = content list_event_types_lookup["content list_agreement_added"]
    content list_agreement_added_event = AttrDict(
        {"_content listId": content listId, "_addedAgreementId": addedAgreementId}
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content list_agreement_added_event}
    )


# event_type: ContentListAgreementsOrdered
def get_content list_agreements_ordered_event():
    event_type = content list_event_types_lookup["content list_agreements_ordered"]
    content list_agreements_ordered_event = AttrDict(
        {"_content listId": 1, "_orderedAgreementIds": [2, 1]}
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content list_agreements_ordered_event}
    )


# event_type: ContentListAgreementDeleted
def get_content list_agreement_delete_event(content listId, deletedAgreementId, deletedAgreementTimestamp):
    event_type = content list_event_types_lookup["content list_agreement_deleted"]
    content list_agreement_delete_event = AttrDict(
        {
            "_content listId": content listId,
            "_deletedAgreementId": deletedAgreementId,
            "_deletedAgreementTimestamp": deletedAgreementTimestamp,
        }
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content list_agreement_delete_event}
    )

    # event_type: ContentListPrivacyUpdated


def get_content list_privacy_updated_event():
    event_type = content list_event_types_lookup["content list_privacy_updated"]
    content list_privacy_updated_event = AttrDict(
        {"_content listId": 1, "_updatedIsPrivate": False}
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content list_privacy_updated_event}
    )


# event_type: ContentListDeleted
def get_content list_deleted_event():
    event_type = content list_event_types_lookup["content list_deleted"]
    content list_deleted_event = AttrDict({"_content listId": 1})
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content list_deleted_event}
    )


def test_index_content list(app):
    """Tests that content lists are indexed correctly"""
    with app.app_context():
        db = get_db()
        cid_metadata_client = CIDMetadataClient({})
        web3 = Web3()
        challenge_event_bus = setup_challenge_bus()
        update_task = UpdateTask(cid_metadata_client, web3, challenge_event_bus)

    with db.scoped_session() as session:
        # ================= Test content list_created Event =================
        event_type, entry = get_content list_created_event()

        block_number = random.randint(1, 10000)
        block_timestamp = 1585336422

        # Some sqlalchemy content list instance
        content list_record = lookup_content list_record(
            update_task, session, entry, block_number, "0x"  # txhash
        )

        parse_content list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content list_record,
            block_timestamp,
            session,
        )

        assert content list_record.content list_owner_id == entry.args._content listOwnerId
        assert content list_record.is_private == entry.args._isPrivate
        assert content list_record.is_album == entry.args._isAlbum
        block_datetime = datetime.utcfromtimestamp(block_timestamp)
        block_integer_time = int(block_timestamp)

        content list_content_array = []
        for agreement_id in entry.args._agreementIds:
            content list_content_array.append(
                {"agreement": agreement_id, "time": block_integer_time}
            )

        assert content list_record.content list_contents == {
            "agreement_ids": content list_content_array
        }
        assert content list_record.created_at == block_datetime

        # ================= Test content list_name_updated Event =================
        event_type, entry = get_content list_name_updated_event()

        assert content list_record.content list_name == None
        parse_content list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content list_record,
            block_timestamp,
            session,
        )
        assert content list_record.content list_name == entry.args._updatedContentListName

        # ================= Test content list_cover_photo_updated Event =================
        event_type, entry = get_content list_cover_photo_updated_event()
        parse_content list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content list_record,
            block_timestamp,
            session,
        )
        assert content list_record.content list_image_sizes_multihash == (
            helpers.multihash_digest_to_cid(entry.args._content listImageMultihashDigest)
        )
        assert content list_record.content list_image_multihash == None

        # ================= Test content list_description_updated Event =================
        event_type, entry = get_content list_description_updated_event()
        assert content list_record.description == None
        parse_content list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content list_record,
            block_timestamp,
            session,
        )
        assert content list_record.description == entry.args._content listDescription

        # ================= Test content list_privacy_updated Event =================
        event_type, entry = get_content list_privacy_updated_event()
        assert content list_record.is_private == True
        parse_content list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content list_record,
            block_timestamp,
            session,
        )
        assert content list_record.is_private == entry.args._updatedIsPrivate

        # ================= Test content list_agreement_added Event =================
        event_type, entry = get_content list_agreement_added_event(1, 1)

        parse_content list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content list_record,
            12,  # block_timestamp,
            session,
        )

        assert len(content list_record.content list_contents["agreement_ids"]) == 1
        last_content list_content = content list_record.content list_contents["agreement_ids"][-1]
        assert last_content list_content == {"agreement": entry.args._addedAgreementId, "time": 12}

        # ================= Test content list_agreement_added with second agreement Event =================
        event_type, entry = get_content list_agreement_added_event(1, 2)

        parse_content list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content list_record,
            13,  # block_timestamp,
            session,
        )

        assert len(content list_record.content list_contents["agreement_ids"]) == 2
        last_content list_content = content list_record.content list_contents["agreement_ids"][-1]
        assert last_content list_content == {"agreement": entry.args._addedAgreementId, "time": 13}

        # ================= Test content list_agreements_ordered Event =================
        event_type, entry = get_content list_agreements_ordered_event()
        parse_content list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content list_record,
            block_timestamp,
            session,
        )

        assert content list_record.content list_contents["agreement_ids"] == [
            {"agreement": 2, "time": 13},
            {"agreement": 1, "time": 12},
        ]

        # ================= Test content list_agreement_delete_event Event =================
        event_type, entry = get_content list_agreement_delete_event(1, 1, 12)

        parse_content list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content list_record,
            block_timestamp,
            session,
        )

        assert len(content list_record.content list_contents["agreement_ids"]) == 1
        last_content list_content = content list_record.content list_contents["agreement_ids"][-1]
        assert content list_record.content list_contents["agreement_ids"] == [
            {"agreement": 2, "time": 13}
        ]

        # ================= Test content list_agreement_delete_event Event =================
        # This should be a no-op
        event_type, entry = get_content list_agreement_delete_event(1, 1, 12)

        parse_content list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content list_record,
            block_timestamp,
            session,
        )

        assert len(content list_record.content list_contents["agreement_ids"]) == 1
        assert content list_record.content list_contents["agreement_ids"] == [
            {"agreement": 2, "time": 13}
        ]

        # ================= Test content list_deleted Event =================
        event_type, entry = get_content list_deleted_event()
        assert content list_record.is_delete == False
        parse_content list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content list_record,
            block_timestamp,
            session,
        )
        assert content list_record.is_delete == True


def test_content list_indexing_skip_tx(app, mocker):
    """Tests that content lists skip cursed txs without throwing an error and are able to process other tx in block"""
    with app.app_context():
        db = get_db()
        cid_metadata_client = CIDMetadataClient({})
        web3 = Web3()
        challenge_event_bus = setup_challenge_bus()
        update_task = UpdateTask(cid_metadata_client, web3, challenge_event_bus)

    class TestContentListTransaction:
        pass

    blessed_tx_hash = (
        "0x34004dfaf5bb7cf9998eaf387b877d72d198c6508608e309df3f89e57def4db3"
    )
    blessed_tx = TestContentListTransaction()
    blessed_tx.transactionHash = update_task.web3.toBytes(hexstr=blessed_tx_hash)
    cursed_tx_hash = (
        "0x5fe51d735309d3044ae30055ad29101018a1a399066f6c53ea23800225e3a3be"
    )
    cursed_tx = TestContentListTransaction()
    cursed_tx.transactionHash = update_task.web3.toBytes(hexstr=cursed_tx_hash)
    test_block_number = 25278765
    test_block_timestamp = 1
    test_block_hash = update_task.web3.toHex(block_hash)
    test_content list_factory_txs = [cursed_tx, blessed_tx]
    test_timestamp = datetime.utcfromtimestamp(test_block_timestamp)
    blessed_content list_record = ContentList(
        blockhash=test_block_hash,
        blocknumber=test_block_number,
        txhash=blessed_tx_hash,
        content list_id=91232,
        is_album=False,
        is_private=False,
        content list_name="test",
        content list_contents={},
        content list_image_multihash=None,
        content list_image_sizes_multihash=None,
        description="testing!",
        upc=None,
        is_current=True,
        is_delete=True,
        last_added_to=None,
        updated_at=test_timestamp,
        created_at=test_timestamp,
        content list_owner_id=1,
    )
    cursed_content list_record = ContentList(
        blockhash=test_block_hash,
        blocknumber=test_block_number,
        txhash=cursed_tx_hash,
        content list_id=91238,
        is_album=None,
        is_private=None,
        content list_name=None,
        content list_image_multihash=None,
        content list_image_sizes_multihash=None,
        description=None,
        upc=None,
        is_current=True,
        is_delete=True,
        last_added_to=None,
        updated_at=test_timestamp,
        created_at=None,
    )

    mocker.patch(
        "src.tasks.content lists.lookup_content list_record",
        side_effect=[cursed_content list_record, blessed_content list_record],
        autospec=True,
    )
    mocker.patch(
        "src.tasks.content lists.get_content list_events_tx",
        side_effect=[
            [],  # no content list created events
            [
                {
                    "args": AttrDict(
                        {
                            "_content listId": cursed_content list_record.content list_id,
                        }
                    )
                },
            ],  # content list deleted event
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],  # second tx receipt
            [
                {
                    "args": AttrDict(
                        {
                            "_content listId": blessed_content list_record.content list_id,
                        }
                    )
                },
            ],  # content list deleted event
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
        ],
        autospec=True,
    )
    test_ipfs_metadata = {}

    with db.scoped_session() as session:
        try:
            current_block = Block(
                blockhash=test_block_hash,
                parenthash=test_block_hash,
                number=test_block_number,
                is_current=True,
            )
            session.add(current_block)
            (total_changes, updated_content list_ids_set) = content list_state_update(
                update_task,
                update_task,
                session,
                test_content list_factory_txs,
                test_block_number,
                test_block_timestamp,
                block_hash,
                test_ipfs_metadata,
            )
            assert len(updated_content list_ids_set) == 1
            assert (
                list(updated_content list_ids_set)[0] == blessed_content list_record.content list_id
            )
            assert total_changes == 1
            assert (
                session.query(SkippedTransaction)
                .filter(
                    SkippedTransaction.txhash == cursed_content list_record.txhash,
                    SkippedTransaction.level == SkippedTransactionLevel.node,
                )
                .first()
            )
            assert (
                session.query(ContentList)
                .filter(ContentList.content list_id == blessed_content list_record.content list_id)
                .first()
            )
            assert (
                session.query(ContentList)
                .filter(ContentList.content list_id == cursed_content list_record.content list_id)
                .first()
            ) == None
        except Exception:
            assert False
