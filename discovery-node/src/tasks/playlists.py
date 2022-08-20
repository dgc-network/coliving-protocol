import logging
from datetime import datetime
from typing import Any, Dict, Set, Tuple

from sqlalchemy.orm.session import Session, make_transient
from src.challenges.challenge_event import ChallengeEvent
from src.database_task import DatabaseTask
from src.models.contentLists.contentList import ContentList
from src.queries.skipped_transactions import add_node_level_skipped_transaction
from src.utils import helpers
from src.utils.indexing_errors import EntityMissingRequiredFieldError, IndexingError
from src.utils.model_nullable_validator import all_required_fields_present
from src.utils.contentList_event_constants import (
    contentList_event_types_arr,
    contentList_event_types_lookup,
)

logger = logging.getLogger(__name__)


def contentList_state_update(
    self,
    update_task: DatabaseTask,
    session: Session,
    contentList_factory_txs,
    block_number,
    block_timestamp,
    block_hash,
    _ipfs_metadata,  # prefix unused args with underscore to prevent pylint
) -> Tuple[int, Set]:
    """Return Tuple containing int representing number of ContentList model state changes found in transaction and set of processed contentList IDs."""
    blockhash = update_task.web3.toHex(block_hash)
    num_total_changes = 0
    skipped_tx_count = 0
    # This stores the contentList_ids created or updated in the set of transactions
    contentList_ids: Set[int] = set()

    challenge_bus = update_task.challenge_event_bus

    if not contentList_factory_txs:
        return num_total_changes, contentList_ids

    contentList_events_lookup: Dict[int, Dict[str, Any]] = {}
    for tx_receipt in contentList_factory_txs:
        txhash = update_task.web3.toHex(tx_receipt.transactionHash)
        for event_type in contentList_event_types_arr:
            contentList_events_tx = get_contentList_events_tx(
                update_task, event_type, tx_receipt
            )
            processedEntries = 0  # if record does not get added, do not count towards num_total_changes
            for entry in contentList_events_tx:
                existing_contentList_record = None
                contentList_id = helpers.get_tx_arg(entry, "_contentListId")
                try:
                    # look up or populate existing record
                    if contentList_id in contentList_events_lookup:
                        existing_contentList_record = contentList_events_lookup[contentList_id][
                            "contentList"
                        ]
                    else:
                        existing_contentList_record = lookup_contentList_record(
                            update_task, session, entry, block_number, txhash
                        )

                    # parse contentList event to add metadata to record
                    contentList_record = parse_contentList_event(
                        self,
                        update_task,
                        entry,
                        event_type,
                        existing_contentList_record,
                        block_timestamp,
                        session,
                    )

                    # process contentList record
                    if contentList_record is not None:
                        if contentList_id not in contentList_events_lookup:
                            contentList_events_lookup[contentList_id] = {
                                "contentList": contentList_record,
                                "events": [],
                            }
                        else:
                            contentList_events_lookup[contentList_id][
                                "contentList"
                            ] = contentList_record
                        contentList_events_lookup[contentList_id]["events"].append(event_type)
                        contentList_ids.add(contentList_id)
                        processedEntries += 1
                except EntityMissingRequiredFieldError as e:
                    logger.warning(f"Skipping tx {txhash} with error {e}")
                    skipped_tx_count += 1
                    add_node_level_skipped_transaction(
                        session, block_number, blockhash, txhash
                    )
                    pass
                except Exception as e:
                    logger.info("Error in parse contentList transaction")
                    raise IndexingError(
                        "contentList", block_number, blockhash, txhash, str(e)
                    ) from e
            num_total_changes += processedEntries

    logger.info(
        f"index.py | contentLists.py | There are {num_total_changes} events processed and {skipped_tx_count} skipped transactions."
    )

    for contentList_id, value_obj in contentList_events_lookup.items():
        logger.info(f"index.py | contentLists.py | Adding {value_obj['contentList']})")
        if value_obj["events"]:
            invalidate_old_contentList(session, contentList_id)
            session.add(value_obj["contentList"])
            if (
                contentList_event_types_lookup["contentList_agreement_added"]
                in value_obj["events"]
            ):
                challenge_bus.dispatch(
                    ChallengeEvent.first_contentList,
                    value_obj["contentList"].blocknumber,
                    value_obj["contentList"].contentList_owner_id,
                )

    return num_total_changes, contentList_ids


def get_contentList_events_tx(update_task, event_type, tx_receipt):
    return getattr(update_task.contentList_contract.events, event_type)().processReceipt(
        tx_receipt
    )


def lookup_contentList_record(update_task, session, entry, block_number, txhash):
    event_blockhash = update_task.web3.toHex(entry.blockHash)
    event_args = entry["args"]
    contentList_id = event_args._contentListId

    # Check if contentList record is in the DB
    contentList_exists = (
        session.query(ContentList).filter_by(contentList_id=event_args._contentListId).count()
        > 0
    )

    contentList_record = None
    if contentList_exists:
        contentList_record = (
            session.query(ContentList)
            .filter(ContentList.contentList_id == contentList_id, ContentList.is_current == True)
            .first()
        )

        # expunge the result from sqlalchemy so we can modify it without UPDATE statements being made
        # https://stackoverflow.com/questions/28871406/how-to-clone-a-sqlalchemy-db-object-with-new-primary-key
        session.expunge(contentList_record)
        make_transient(contentList_record)
    else:
        contentList_record = ContentList(
            contentList_id=contentList_id, is_current=True, is_delete=False
        )

    # update these fields regardless of type
    contentList_record.blocknumber = block_number
    contentList_record.blockhash = event_blockhash
    contentList_record.txhash = txhash

    return contentList_record


def invalidate_old_contentList(session, contentList_id):
    # check if contentList id is in db
    contentList_exists = (
        session.query(ContentList).filter_by(contentList_id=contentList_id).count() > 0
    )

    if contentList_exists:
        # Update existing record in db to is_current = False
        num_invalidated_contentLists = (
            session.query(ContentList)
            .filter(ContentList.contentList_id == contentList_id, ContentList.is_current == True)
            .update({"is_current": False})
        )
        assert (
            num_invalidated_contentLists > 0
        ), "Update operation requires a current contentList to be invalidated"


def parse_contentList_event(
    self, update_task, entry, event_type, contentList_record, block_timestamp, session
):
    event_args = entry["args"]
    # Just use block_timestamp as integer
    block_datetime = datetime.utcfromtimestamp(block_timestamp)
    block_integer_time = int(block_timestamp)

    if event_type == contentList_event_types_lookup["contentList_created"]:
        logger.info(
            f"index.py | contentLists.py | Creating contentList {contentList_record.contentList_id}"
        )
        contentList_record.contentList_owner_id = event_args._contentListOwnerId
        contentList_record.is_private = event_args._isPrivate
        contentList_record.is_album = event_args._isAlbum

        contentList_content_array = []
        for agreement_id in event_args._agreementIds:
            contentList_content_array.append(
                {"agreement": agreement_id, "time": block_integer_time}
            )

        contentList_record.contentList_contents = {"agreement_ids": contentList_content_array}
        contentList_record.created_at = block_datetime

    if event_type == contentList_event_types_lookup["contentList_deleted"]:
        logger.info(
            f"index.py | contentLists.py | Deleting contentList {contentList_record.contentList_id}"
        )
        contentList_record.is_delete = True

    if event_type == contentList_event_types_lookup["contentList_agreement_added"]:
        if getattr(contentList_record, "contentList_contents") is not None:
            logger.info(
                f"index.py | contentLists.py | Adding agreement {event_args._addedAgreementId} to contentList \
            {contentList_record.contentList_id}"
            )
            old_contentList_content_array = contentList_record.contentList_contents["agreement_ids"]
            new_contentList_content_array = old_contentList_content_array
            # Append new agreement object
            new_contentList_content_array.append(
                {"agreement": event_args._addedAgreementId, "time": block_integer_time}
            )
            contentList_record.contentList_contents = {
                "agreement_ids": new_contentList_content_array
            }
            contentList_record.timestamp = block_datetime
            contentList_record.last_added_to = block_datetime

    if event_type == contentList_event_types_lookup["contentList_agreement_deleted"]:
        if getattr(contentList_record, "contentList_contents") is not None:
            logger.info(
                f"index.py | contentLists.py | Removing agreement {event_args._deletedAgreementId} from \
            contentList {contentList_record.contentList_id}"
            )
            old_contentList_content_array = contentList_record.contentList_contents["agreement_ids"]
            new_contentList_content_array = []
            deleted_agreement_id = event_args._deletedAgreementId
            deleted_agreement_timestamp = int(event_args._deletedAgreementTimestamp)
            delete_agreement_entry_found = False
            for agreement_entry in old_contentList_content_array:
                if (
                    agreement_entry["agreement"] == deleted_agreement_id
                    and agreement_entry["time"] == deleted_agreement_timestamp
                    and not delete_agreement_entry_found
                ):
                    delete_agreement_entry_found = True
                    continue
                new_contentList_content_array.append(agreement_entry)

            contentList_record.contentList_contents = {
                "agreement_ids": new_contentList_content_array
            }

    if event_type == contentList_event_types_lookup["contentList_agreements_ordered"]:
        if getattr(contentList_record, "contentList_contents") is not None:
            logger.info(
                f"index.py | contentLists.py | Ordering contentList {contentList_record.contentList_id}"
            )
            old_contentList_content_array = contentList_record.contentList_contents["agreement_ids"]

            intermediate_agreement_time_lookup_dict = {}

            for old_contentList_entry in old_contentList_content_array:
                agreement_id = old_contentList_entry["agreement"]
                agreement_time = old_contentList_entry["time"]

                if agreement_id not in intermediate_agreement_time_lookup_dict:
                    intermediate_agreement_time_lookup_dict[agreement_id] = []

                intermediate_agreement_time_lookup_dict[agreement_id].append(agreement_time)

            contentList_content_array = []
            for agreement_id in event_args._orderedAgreementIds:
                if agreement_id in intermediate_agreement_time_lookup_dict:
                    agreement_time_array_length = len(
                        intermediate_agreement_time_lookup_dict[agreement_id]
                    )
                    if agreement_time_array_length > 1:
                        agreement_time = intermediate_agreement_time_lookup_dict[agreement_id].pop(
                            0
                        )
                    elif agreement_time_array_length == 1:
                        agreement_time = intermediate_agreement_time_lookup_dict[agreement_id][0]
                    else:
                        agreement_time = block_integer_time
                else:
                    logger.info(
                        f"index.py | contentList.py | Agreement {agreement_id} not found, using agreement_time={block_integer_time}"
                    )
                    agreement_time = block_integer_time
                contentList_content_array.append({"agreement": agreement_id, "time": agreement_time})

            contentList_record.contentList_contents = {"agreement_ids": contentList_content_array}

    if event_type == contentList_event_types_lookup["contentList_name_updated"]:
        logger.info(
            f"index.py | contentLists.py | Updating contentList {contentList_record.contentList_id} name \
        to {event_args._updatedContentListName}"
        )
        contentList_record.contentList_name = event_args._updatedContentListName

    if event_type == contentList_event_types_lookup["contentList_privacy_updated"]:
        logger.info(
            f"index.py | contentLists.py | Updating contentList {contentList_record.contentList_id} \
        privacy to {event_args._updatedIsPrivate}"
        )
        contentList_record.is_private = event_args._updatedIsPrivate

    if event_type == contentList_event_types_lookup["contentList_cover_photo_updated"]:
        contentList_record.contentList_image_multihash = helpers.multihash_digest_to_cid(
            event_args._contentListImageMultihashDigest
        )

        # All incoming contentList images are set to ipfs dir in column contentList_image_sizes_multihash
        if contentList_record.contentList_image_multihash:
            logger.info(
                f"index.py | contentLists.py | Processing contentList image \
            {contentList_record.contentList_image_multihash}"
            )
            contentList_record.contentList_image_sizes_multihash = (
                contentList_record.contentList_image_multihash
            )
            contentList_record.contentList_image_multihash = None

    if event_type == contentList_event_types_lookup["contentList_description_updated"]:
        logger.info(
            f"index.py | contentLists.py | Updating contentList {contentList_record.contentList_id} \
        description to {event_args._contentListDescription}"
        )
        contentList_record.description = event_args._contentListDescription

    if event_type == contentList_event_types_lookup["contentList_upc_updated"]:
        logger.info(
            f"index.py | contentLists.py | Updating contentList {contentList_record.contentList_id} UPC \
        to {event_args._contentListUPC}"
        )
        contentList_record.upc = helpers.bytes32_to_str(event_args._contentListUPC)

    contentList_record.updated_at = block_datetime

    if not all_required_fields_present(ContentList, contentList_record):
        raise EntityMissingRequiredFieldError(
            "contentList",
            contentList_record,
            f"Error parsing contentList {contentList_record} with entity missing required field(s)",
        )

    return contentList_record
