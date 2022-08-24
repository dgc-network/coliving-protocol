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
from src.models.contentLists.contentList import ContentList
from src.tasks.contentLists import (
    lookup_content_list_record,
    parse_content_list_event,
    content_list_state_update,
)
from src.utils import helpers
from src.utils.db_session import get_db
from src.utils.content_list_event_constants import content_list_event_types_lookup
from web3 import Web3

block_hash = b"0x8f19da326900d171642af08e6770eedd83509c6c44f6855c98e6a752844e2521"


# event_type: ContentListCreated
def get_content_list_created_event():
    event_type = content_list_event_types_lookup["content_list_created"]
    content_list_created_event = AttrDict(
        {
            "_content_listId": 1,
            "_content_listOwnerId": 1,
            "_isPrivate": True,
            "_isAlbum": False,
            "_agreementIds": [],  # This is a list of numbers (agreement ids)
        }
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content_list_created_event}
    )


# event_type: ContentListNameUpdated
def get_content_list_name_updated_event():
    event_type = content_list_event_types_lookup["content_list_name_updated"]
    content_list_name_updated_event = AttrDict(
        {"_content_listId": 1, "_updatedContentListName": "asdfg"}
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content_list_name_updated_event}
    )


# event_type: ContentListCoverPhotoUpdated
def get_content_list_cover_photo_updated_event():
    event_type = content_list_event_types_lookup["content_list_cover_photo_updated"]
    content_list_cover_photo_updated_event = AttrDict(
        {
            "_content_listId": 1,
            "_content_listImageMultihashDigest": b"\xad\x8d\x1eeG\xf2\x12\xe3\x817"
            + b"\x7f\xb1A\xc6 M~\xfe\x03F\x98f\xab\xfa3\x17ib\xdcC>\xed",
        }
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content_list_cover_photo_updated_event}
    )


# event_type: ContentListDescriptionUpdated
def get_content_list_description_updated_event():
    event_type = content_list_event_types_lookup["content_list_description_updated"]
    content_list_description_updated_event = AttrDict(
        {"_content_listId": 1, "_content_listDescription": "adf"}
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content_list_description_updated_event}
    )


# event_type: ContentListAgreementAdded
def get_content_list_agreement_added_event(contentListId, addedAgreementId):
    event_type = content_list_event_types_lookup["content_list_agreement_added"]
    content_list_agreement_added_event = AttrDict(
        {"_content_listId": contentListId, "_addedAgreementId": addedAgreementId}
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content_list_agreement_added_event}
    )


# event_type: ContentListAgreementsOrdered
def get_content_list_agreements_ordered_event():
    event_type = content_list_event_types_lookup["content_list_agreements_ordered"]
    content_list_agreements_ordered_event = AttrDict(
        {"_content_listId": 1, "_orderedAgreementIds": [2, 1]}
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content_list_agreements_ordered_event}
    )


# event_type: ContentListAgreementDeleted
def get_content_list_agreement_delete_event(contentListId, deletedAgreementId, deletedAgreementTimestamp):
    event_type = content_list_event_types_lookup["content_list_agreement_deleted"]
    content_list_agreement_delete_event = AttrDict(
        {
            "_content_listId": contentListId,
            "_deletedAgreementId": deletedAgreementId,
            "_deletedAgreementTimestamp": deletedAgreementTimestamp,
        }
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content_list_agreement_delete_event}
    )

    # event_type: ContentListPrivacyUpdated


def get_content_list_privacy_updated_event():
    event_type = content_list_event_types_lookup["content_list_privacy_updated"]
    content_list_privacy_updated_event = AttrDict(
        {"_content_listId": 1, "_updatedIsPrivate": False}
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content_list_privacy_updated_event}
    )


# event_type: ContentListDeleted
def get_content_list_deleted_event():
    event_type = content_list_event_types_lookup["content_list_deleted"]
    content_list_deleted_event = AttrDict({"_content_listId": 1})
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": content_list_deleted_event}
    )


def test_index_content_list(app):
    """Tests that contentLists are indexed correctly"""
    with app.app_context():
        db = get_db()
        cid_metadata_client = CIDMetadataClient({})
        web3 = Web3()
        challenge_event_bus = setup_challenge_bus()
        update_task = UpdateTask(cid_metadata_client, web3, challenge_event_bus)

    with db.scoped_session() as session:
        # ================= Test content_list_created Event =================
        event_type, entry = get_content_list_created_event()

        block_number = random.randint(1, 10000)
        block_timestamp = 1585336422

        # Some sqlalchemy contentList instance
        content_list_record = lookup_content_list_record(
            update_task, session, entry, block_number, "0x"  # txhash
        )

        parse_content_list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content_list_record,
            block_timestamp,
            session,
        )

        assert content_list_record.content_list_owner_id == entry.args._content_listOwnerId
        assert content_list_record.is_private == entry.args._isPrivate
        assert content_list_record.is_album == entry.args._isAlbum
        block_datetime = datetime.utcfromtimestamp(block_timestamp)
        block_integer_time = int(block_timestamp)

        content_list_content_array = []
        for agreement_id in entry.args._agreementIds:
            content_list_content_array.append(
                {"agreement": agreement_id, "time": block_integer_time}
            )

        assert content_list_record.content_list_contents == {
            "agreement_ids": content_list_content_array
        }
        assert content_list_record.created_at == block_datetime

        # ================= Test content_list_name_updated Event =================
        event_type, entry = get_content_list_name_updated_event()

        assert content_list_record.content_list_name == None
        parse_content_list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content_list_record,
            block_timestamp,
            session,
        )
        assert content_list_record.content_list_name == entry.args._updatedContentListName

        # ================= Test content_list_cover_photo_updated Event =================
        event_type, entry = get_content_list_cover_photo_updated_event()
        parse_content_list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content_list_record,
            block_timestamp,
            session,
        )
        assert content_list_record.content_list_image_sizes_multihash == (
            helpers.multihash_digest_to_cid(entry.args._content_listImageMultihashDigest)
        )
        assert content_list_record.content_list_image_multihash == None

        # ================= Test content_list_description_updated Event =================
        event_type, entry = get_content_list_description_updated_event()
        assert content_list_record.description == None
        parse_content_list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content_list_record,
            block_timestamp,
            session,
        )
        assert content_list_record.description == entry.args._content_listDescription

        # ================= Test content_list_privacy_updated Event =================
        event_type, entry = get_content_list_privacy_updated_event()
        assert content_list_record.is_private == True
        parse_content_list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content_list_record,
            block_timestamp,
            session,
        )
        assert content_list_record.is_private == entry.args._updatedIsPrivate

        # ================= Test content_list_agreement_added Event =================
        event_type, entry = get_content_list_agreement_added_event(1, 1)

        parse_content_list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content_list_record,
            12,  # block_timestamp,
            session,
        )

        assert len(content_list_record.content_list_contents["agreement_ids"]) == 1
        last_content_list_content = content_list_record.content_list_contents["agreement_ids"][-1]
        assert last_content_list_content == {"agreement": entry.args._addedAgreementId, "time": 12}

        # ================= Test content_list_agreement_added with second agreement Event =================
        event_type, entry = get_content_list_agreement_added_event(1, 2)

        parse_content_list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content_list_record,
            13,  # block_timestamp,
            session,
        )

        assert len(content_list_record.content_list_contents["agreement_ids"]) == 2
        last_content_list_content = content_list_record.content_list_contents["agreement_ids"][-1]
        assert last_content_list_content == {"agreement": entry.args._addedAgreementId, "time": 13}

        # ================= Test content_list_agreements_ordered Event =================
        event_type, entry = get_content_list_agreements_ordered_event()
        parse_content_list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content_list_record,
            block_timestamp,
            session,
        )

        assert content_list_record.content_list_contents["agreement_ids"] == [
            {"agreement": 2, "time": 13},
            {"agreement": 1, "time": 12},
        ]

        # ================= Test content_list_agreement_delete_event Event =================
        event_type, entry = get_content_list_agreement_delete_event(1, 1, 12)

        parse_content_list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content_list_record,
            block_timestamp,
            session,
        )

        assert len(content_list_record.content_list_contents["agreement_ids"]) == 1
        last_content_list_content = content_list_record.content_list_contents["agreement_ids"][-1]
        assert content_list_record.content_list_contents["agreement_ids"] == [
            {"agreement": 2, "time": 13}
        ]

        # ================= Test content_list_agreement_delete_event Event =================
        # This should be a no-op
        event_type, entry = get_content_list_agreement_delete_event(1, 1, 12)

        parse_content_list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content_list_record,
            block_timestamp,
            session,
        )

        assert len(content_list_record.content_list_contents["agreement_ids"]) == 1
        assert content_list_record.content_list_contents["agreement_ids"] == [
            {"agreement": 2, "time": 13}
        ]

        # ================= Test content_list_deleted Event =================
        event_type, entry = get_content_list_deleted_event()
        assert content_list_record.is_delete == False
        parse_content_list_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            content_list_record,
            block_timestamp,
            session,
        )
        assert content_list_record.is_delete == True


def test_content_list_indexing_skip_tx(app, mocker):
    """Tests that contentLists skip cursed txs without throwing an error and are able to process other tx in block"""
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
    test_content_list_factory_txs = [cursed_tx, blessed_tx]
    test_timestamp = datetime.utcfromtimestamp(test_block_timestamp)
    blessed_content_list_record = ContentList(
        blockhash=test_block_hash,
        blocknumber=test_block_number,
        txhash=blessed_tx_hash,
        content_list_id=91232,
        is_album=False,
        is_private=False,
        content_list_name="test",
        content_list_contents={},
        content_list_image_multihash=None,
        content_list_image_sizes_multihash=None,
        description="testing!",
        upc=None,
        is_current=True,
        is_delete=True,
        last_added_to=None,
        updated_at=test_timestamp,
        created_at=test_timestamp,
        content_list_owner_id=1,
    )
    cursed_content_list_record = ContentList(
        blockhash=test_block_hash,
        blocknumber=test_block_number,
        txhash=cursed_tx_hash,
        content_list_id=91238,
        is_album=None,
        is_private=None,
        content_list_name=None,
        content_list_image_multihash=None,
        content_list_image_sizes_multihash=None,
        description=None,
        upc=None,
        is_current=True,
        is_delete=True,
        last_added_to=None,
        updated_at=test_timestamp,
        created_at=None,
    )

    mocker.patch(
        "src.tasks.contentLists.lookup_content_list_record",
        side_effect=[cursed_content_list_record, blessed_content_list_record],
        autospec=True,
    )
    mocker.patch(
        "src.tasks.contentLists.get_content_list_events_tx",
        side_effect=[
            [],  # no contentList created events
            [
                {
                    "args": AttrDict(
                        {
                            "_content_listId": cursed_content_list_record.content_list_id,
                        }
                    )
                },
            ],  # contentList deleted event
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
                            "_content_listId": blessed_content_list_record.content_list_id,
                        }
                    )
                },
            ],  # contentList deleted event
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
            (total_changes, updated_content_list_ids_set) = content_list_state_update(
                update_task,
                update_task,
                session,
                test_content_list_factory_txs,
                test_block_number,
                test_block_timestamp,
                block_hash,
                test_ipfs_metadata,
            )
            assert len(updated_content_list_ids_set) == 1
            assert (
                list(updated_content_list_ids_set)[0] == blessed_content_list_record.content_list_id
            )
            assert total_changes == 1
            assert (
                session.query(SkippedTransaction)
                .filter(
                    SkippedTransaction.txhash == cursed_content_list_record.txhash,
                    SkippedTransaction.level == SkippedTransactionLevel.node,
                )
                .first()
            )
            assert (
                session.query(ContentList)
                .filter(ContentList.content_list_id == blessed_content_list_record.content_list_id)
                .first()
            )
            assert (
                session.query(ContentList)
                .filter(ContentList.content_list_id == cursed_content_list_record.content_list_id)
                .first()
            ) == None
        except Exception:
            assert False
