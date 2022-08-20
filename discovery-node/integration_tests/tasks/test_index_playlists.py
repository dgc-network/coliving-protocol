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
    lookup_contentList_record,
    parse_contentList_event,
    contentList_state_update,
)
from src.utils import helpers
from src.utils.db_session import get_db
from src.utils.contentList_event_constants import contentList_event_types_lookup
from web3 import Web3

block_hash = b"0x8f19da326900d171642af08e6770eedd83509c6c44f6855c98e6a752844e2521"


# event_type: ContentListCreated
def get_contentList_created_event():
    event_type = contentList_event_types_lookup["contentList_created"]
    contentList_created_event = AttrDict(
        {
            "_contentListId": 1,
            "_contentListOwnerId": 1,
            "_isPrivate": True,
            "_isAlbum": False,
            "_agreementIds": [],  # This is a list of numbers (agreement ids)
        }
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": contentList_created_event}
    )


# event_type: ContentListNameUpdated
def get_contentList_name_updated_event():
    event_type = contentList_event_types_lookup["contentList_name_updated"]
    contentList_name_updated_event = AttrDict(
        {"_contentListId": 1, "_updatedContentListName": "asdfg"}
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": contentList_name_updated_event}
    )


# event_type: ContentListCoverPhotoUpdated
def get_contentList_cover_photo_updated_event():
    event_type = contentList_event_types_lookup["contentList_cover_photo_updated"]
    contentList_cover_photo_updated_event = AttrDict(
        {
            "_contentListId": 1,
            "_contentListImageMultihashDigest": b"\xad\x8d\x1eeG\xf2\x12\xe3\x817"
            + b"\x7f\xb1A\xc6 M~\xfe\x03F\x98f\xab\xfa3\x17ib\xdcC>\xed",
        }
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": contentList_cover_photo_updated_event}
    )


# event_type: ContentListDescriptionUpdated
def get_contentList_description_updated_event():
    event_type = contentList_event_types_lookup["contentList_description_updated"]
    contentList_description_updated_event = AttrDict(
        {"_contentListId": 1, "_contentListDescription": "adf"}
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": contentList_description_updated_event}
    )


# event_type: ContentListAgreementAdded
def get_contentList_agreement_added_event(contentListId, addedAgreementId):
    event_type = contentList_event_types_lookup["contentList_agreement_added"]
    contentList_agreement_added_event = AttrDict(
        {"_contentListId": contentListId, "_addedAgreementId": addedAgreementId}
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": contentList_agreement_added_event}
    )


# event_type: ContentListAgreementsOrdered
def get_contentList_agreements_ordered_event():
    event_type = contentList_event_types_lookup["contentList_agreements_ordered"]
    contentList_agreements_ordered_event = AttrDict(
        {"_contentListId": 1, "_orderedAgreementIds": [2, 1]}
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": contentList_agreements_ordered_event}
    )


# event_type: ContentListAgreementDeleted
def get_contentList_agreement_delete_event(contentListId, deletedAgreementId, deletedAgreementTimestamp):
    event_type = contentList_event_types_lookup["contentList_agreement_deleted"]
    contentList_agreement_delete_event = AttrDict(
        {
            "_contentListId": contentListId,
            "_deletedAgreementId": deletedAgreementId,
            "_deletedAgreementTimestamp": deletedAgreementTimestamp,
        }
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": contentList_agreement_delete_event}
    )

    # event_type: ContentListPrivacyUpdated


def get_contentList_privacy_updated_event():
    event_type = contentList_event_types_lookup["contentList_privacy_updated"]
    contentList_privacy_updated_event = AttrDict(
        {"_contentListId": 1, "_updatedIsPrivate": False}
    )
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": contentList_privacy_updated_event}
    )


# event_type: ContentListDeleted
def get_contentList_deleted_event():
    event_type = contentList_event_types_lookup["contentList_deleted"]
    contentList_deleted_event = AttrDict({"_contentListId": 1})
    return event_type, AttrDict(
        {"blockHash": block_hash, "args": contentList_deleted_event}
    )


def test_index_contentList(app):
    """Tests that contentLists are indexed correctly"""
    with app.app_context():
        db = get_db()
        cid_metadata_client = CIDMetadataClient({})
        web3 = Web3()
        challenge_event_bus = setup_challenge_bus()
        update_task = UpdateTask(cid_metadata_client, web3, challenge_event_bus)

    with db.scoped_session() as session:
        # ================= Test contentList_created Event =================
        event_type, entry = get_contentList_created_event()

        block_number = random.randint(1, 10000)
        block_timestamp = 1585336422

        # Some sqlalchemy contentList instance
        contentList_record = lookup_contentList_record(
            update_task, session, entry, block_number, "0x"  # txhash
        )

        parse_contentList_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            contentList_record,
            block_timestamp,
            session,
        )

        assert contentList_record.contentList_owner_id == entry.args._contentListOwnerId
        assert contentList_record.is_private == entry.args._isPrivate
        assert contentList_record.is_album == entry.args._isAlbum
        block_datetime = datetime.utcfromtimestamp(block_timestamp)
        block_integer_time = int(block_timestamp)

        contentList_content_array = []
        for agreement_id in entry.args._agreementIds:
            contentList_content_array.append(
                {"agreement": agreement_id, "time": block_integer_time}
            )

        assert contentList_record.contentList_contents == {
            "agreement_ids": contentList_content_array
        }
        assert contentList_record.created_at == block_datetime

        # ================= Test contentList_name_updated Event =================
        event_type, entry = get_contentList_name_updated_event()

        assert contentList_record.contentList_name == None
        parse_contentList_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            contentList_record,
            block_timestamp,
            session,
        )
        assert contentList_record.contentList_name == entry.args._updatedContentListName

        # ================= Test contentList_cover_photo_updated Event =================
        event_type, entry = get_contentList_cover_photo_updated_event()
        parse_contentList_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            contentList_record,
            block_timestamp,
            session,
        )
        assert contentList_record.contentList_image_sizes_multihash == (
            helpers.multihash_digest_to_cid(entry.args._contentListImageMultihashDigest)
        )
        assert contentList_record.contentList_image_multihash == None

        # ================= Test contentList_description_updated Event =================
        event_type, entry = get_contentList_description_updated_event()
        assert contentList_record.description == None
        parse_contentList_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            contentList_record,
            block_timestamp,
            session,
        )
        assert contentList_record.description == entry.args._contentListDescription

        # ================= Test contentList_privacy_updated Event =================
        event_type, entry = get_contentList_privacy_updated_event()
        assert contentList_record.is_private == True
        parse_contentList_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            contentList_record,
            block_timestamp,
            session,
        )
        assert contentList_record.is_private == entry.args._updatedIsPrivate

        # ================= Test contentList_agreement_added Event =================
        event_type, entry = get_contentList_agreement_added_event(1, 1)

        parse_contentList_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            contentList_record,
            12,  # block_timestamp,
            session,
        )

        assert len(contentList_record.contentList_contents["agreement_ids"]) == 1
        last_contentList_content = contentList_record.contentList_contents["agreement_ids"][-1]
        assert last_contentList_content == {"agreement": entry.args._addedAgreementId, "time": 12}

        # ================= Test contentList_agreement_added with second agreement Event =================
        event_type, entry = get_contentList_agreement_added_event(1, 2)

        parse_contentList_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            contentList_record,
            13,  # block_timestamp,
            session,
        )

        assert len(contentList_record.contentList_contents["agreement_ids"]) == 2
        last_contentList_content = contentList_record.contentList_contents["agreement_ids"][-1]
        assert last_contentList_content == {"agreement": entry.args._addedAgreementId, "time": 13}

        # ================= Test contentList_agreements_ordered Event =================
        event_type, entry = get_contentList_agreements_ordered_event()
        parse_contentList_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            contentList_record,
            block_timestamp,
            session,
        )

        assert contentList_record.contentList_contents["agreement_ids"] == [
            {"agreement": 2, "time": 13},
            {"agreement": 1, "time": 12},
        ]

        # ================= Test contentList_agreement_delete_event Event =================
        event_type, entry = get_contentList_agreement_delete_event(1, 1, 12)

        parse_contentList_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            contentList_record,
            block_timestamp,
            session,
        )

        assert len(contentList_record.contentList_contents["agreement_ids"]) == 1
        last_contentList_content = contentList_record.contentList_contents["agreement_ids"][-1]
        assert contentList_record.contentList_contents["agreement_ids"] == [
            {"agreement": 2, "time": 13}
        ]

        # ================= Test contentList_agreement_delete_event Event =================
        # This should be a no-op
        event_type, entry = get_contentList_agreement_delete_event(1, 1, 12)

        parse_contentList_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            contentList_record,
            block_timestamp,
            session,
        )

        assert len(contentList_record.contentList_contents["agreement_ids"]) == 1
        assert contentList_record.contentList_contents["agreement_ids"] == [
            {"agreement": 2, "time": 13}
        ]

        # ================= Test contentList_deleted Event =================
        event_type, entry = get_contentList_deleted_event()
        assert contentList_record.is_delete == False
        parse_contentList_event(
            None,  # self - not used
            None,  # update_task - not used
            entry,
            event_type,
            contentList_record,
            block_timestamp,
            session,
        )
        assert contentList_record.is_delete == True


def test_contentList_indexing_skip_tx(app, mocker):
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
    test_contentList_factory_txs = [cursed_tx, blessed_tx]
    test_timestamp = datetime.utcfromtimestamp(test_block_timestamp)
    blessed_contentList_record = ContentList(
        blockhash=test_block_hash,
        blocknumber=test_block_number,
        txhash=blessed_tx_hash,
        contentList_id=91232,
        is_album=False,
        is_private=False,
        contentList_name="test",
        contentList_contents={},
        contentList_image_multihash=None,
        contentList_image_sizes_multihash=None,
        description="testing!",
        upc=None,
        is_current=True,
        is_delete=True,
        last_added_to=None,
        updated_at=test_timestamp,
        created_at=test_timestamp,
        contentList_owner_id=1,
    )
    cursed_contentList_record = ContentList(
        blockhash=test_block_hash,
        blocknumber=test_block_number,
        txhash=cursed_tx_hash,
        contentList_id=91238,
        is_album=None,
        is_private=None,
        contentList_name=None,
        contentList_image_multihash=None,
        contentList_image_sizes_multihash=None,
        description=None,
        upc=None,
        is_current=True,
        is_delete=True,
        last_added_to=None,
        updated_at=test_timestamp,
        created_at=None,
    )

    mocker.patch(
        "src.tasks.contentLists.lookup_contentList_record",
        side_effect=[cursed_contentList_record, blessed_contentList_record],
        autospec=True,
    )
    mocker.patch(
        "src.tasks.contentLists.get_contentList_events_tx",
        side_effect=[
            [],  # no contentList created events
            [
                {
                    "args": AttrDict(
                        {
                            "_contentListId": cursed_contentList_record.contentList_id,
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
                            "_contentListId": blessed_contentList_record.contentList_id,
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
            (total_changes, updated_contentList_ids_set) = contentList_state_update(
                update_task,
                update_task,
                session,
                test_contentList_factory_txs,
                test_block_number,
                test_block_timestamp,
                block_hash,
                test_ipfs_metadata,
            )
            assert len(updated_contentList_ids_set) == 1
            assert (
                list(updated_contentList_ids_set)[0] == blessed_contentList_record.contentList_id
            )
            assert total_changes == 1
            assert (
                session.query(SkippedTransaction)
                .filter(
                    SkippedTransaction.txhash == cursed_contentList_record.txhash,
                    SkippedTransaction.level == SkippedTransactionLevel.node,
                )
                .first()
            )
            assert (
                session.query(ContentList)
                .filter(ContentList.contentList_id == blessed_contentList_record.contentList_id)
                .first()
            )
            assert (
                session.query(ContentList)
                .filter(ContentList.contentList_id == cursed_contentList_record.contentList_id)
                .first()
            ) == None
        except Exception:
            assert False
