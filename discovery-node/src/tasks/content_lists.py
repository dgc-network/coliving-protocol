import logging
from datetime import datetime
from typing import Any, Dict, Set, Tuple

from sqlalchemy.orm.session import Session, make_transient
from src.challenges.challenge_event import ChallengeEvent
from src.database_task import DatabaseTask
from src.models.content_lists.content_list import ContentList
from src.queries.skipped_transactions import add_node_level_skipped_transaction
from src.utils import helpers
from src.utils.indexing_errors import EntityMissingRequiredFieldError, IndexingError
from src.utils.model_nullable_validator import all_required_fields_present
from src.utils.content_list_event_constants import (
    content_list_event_types_arr,
    content_list_event_types_lookup,
)

logger = logging.getLogger(__name__)


def content_list_state_update(
    self,
    update_task: DatabaseTask,
    session: Session,
    content_list_factory_txs,
    block_number,
    block_timestamp,
    block_hash,
    _ipfs_metadata,  # prefix unused args with underscore to prevent pylint
) -> Tuple[int, Set]:
    """Return Tuple containing int representing number of ContentList model state changes found in transaction and set of processed contentList IDs."""
    blockhash = update_task.web3.toHex(block_hash)
    num_total_changes = 0
    skipped_tx_count = 0
    # This stores the content_list_ids created or updated in the set of transactions
    content_list_ids: Set[int] = set()

    challenge_bus = update_task.challenge_event_bus

    if not content_list_factory_txs:
        return num_total_changes, content_list_ids

    content_list_events_lookup: Dict[int, Dict[str, Any]] = {}
    for tx_receipt in content_list_factory_txs:
        txhash = update_task.web3.toHex(tx_receipt.transactionHash)
        for event_type in content_list_event_types_arr:
            content_list_events_tx = get_content_list_events_tx(
                update_task, event_type, tx_receipt
            )
            processedEntries = 0  # if record does not get added, do not count towards num_total_changes
            for entry in content_list_events_tx:
                existing_content_list_record = None
                content_list_id = helpers.get_tx_arg(entry, "_contentListId")
                try:
                    # look up or populate existing record
                    if content_list_id in content_list_events_lookup:
                        existing_content_list_record = content_list_events_lookup[content_list_id][
                            "content_list"
                        ]
                    else:
                        existing_content_list_record = lookup_content_list_record(
                            update_task, session, entry, block_number, txhash
                        )

                    # parse contentList event to add metadata to record
                    content_list_record = parse_content_list_event(
                        self,
                        update_task,
                        entry,
                        event_type,
                        existing_content_list_record,
                        block_timestamp,
                        session,
                    )

                    # process contentList record
                    if content_list_record is not None:
                        if content_list_id not in content_list_events_lookup:
                            content_list_events_lookup[content_list_id] = {
                                "content_list": content_list_record,
                                "events": [],
                            }
                        else:
                            content_list_events_lookup[content_list_id][
                                "content_list"
                            ] = content_list_record
                        content_list_events_lookup[content_list_id]["events"].append(event_type)
                        content_list_ids.add(content_list_id)
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
                        "content_list", block_number, blockhash, txhash, str(e)
                    ) from e
            num_total_changes += processedEntries

    logger.info(
        f"index.py | contentLists.py | There are {num_total_changes} events processed and {skipped_tx_count} skipped transactions."
    )

    for content_list_id, value_obj in content_list_events_lookup.items():
        logger.info(f"index.py | contentLists.py | Adding {value_obj['contentList']})")
        if value_obj["events"]:
            invalidate_old_content_list(session, content_list_id)
            session.add(value_obj["content_list"])
            if (
                content_list_event_types_lookup["content_list_digital_content_added"]
                in value_obj["events"]
            ):
                challenge_bus.dispatch(
                    ChallengeEvent.first_content_list,
                    value_obj["content_list"].blocknumber,
                    value_obj["content_list"].content_list_owner_id,
                )

    return num_total_changes, content_list_ids


def get_content_list_events_tx(update_task, event_type, tx_receipt):
    return getattr(update_task.content_list_contract.events, event_type)().processReceipt(
        tx_receipt
    )


def lookup_content_list_record(update_task, session, entry, block_number, txhash):
    event_blockhash = update_task.web3.toHex(entry.blockHash)
    event_args = entry["args"]
    content_list_id = event_args._contentListId

    # Check if contentList record is in the DB
    content_list_exists = (
        session.query(ContentList).filter_by(content_list_id=event_args._contentListId).count()
        > 0
    )

    content_list_record = None
    if content_list_exists:
        content_list_record = (
            session.query(ContentList)
            .filter(ContentList.content_list_id == content_list_id, ContentList.is_current == True)
            .first()
        )

        # expunge the result from sqlalchemy so we can modify it without UPDATE statements being made
        # https://stackoverflow.com/questions/28871406/how-to-clone-a-sqlalchemy-db-object-with-new-primary-key
        session.expunge(content_list_record)
        make_transient(content_list_record)
    else:
        content_list_record = ContentList(
            content_list_id=content_list_id, is_current=True, is_delete=False
        )

    # update these fields regardless of type
    content_list_record.blocknumber = block_number
    content_list_record.blockhash = event_blockhash
    content_list_record.txhash = txhash

    return content_list_record


def invalidate_old_content_list(session, content_list_id):
    # check if contentList id is in db
    content_list_exists = (
        session.query(ContentList).filter_by(content_list_id=content_list_id).count() > 0
    )

    if content_list_exists:
        # Update existing record in db to is_current = False
        num_invalidated_content_lists = (
            session.query(ContentList)
            .filter(ContentList.content_list_id == content_list_id, ContentList.is_current == True)
            .update({"is_current": False})
        )
        assert (
            num_invalidated_content_lists > 0
        ), "Update operation requires a current contentList to be invalidated"


def parse_content_list_event(
    self, update_task, entry, event_type, content_list_record, block_timestamp, session
):
    event_args = entry["args"]
    # Just use block_timestamp as integer
    block_datetime = datetime.utcfromtimestamp(block_timestamp)
    block_integer_time = int(block_timestamp)

    if event_type == content_list_event_types_lookup["content_list_created"]:
        logger.info(
            f"index.py | contentLists.py | Creating contentList {content_list_record.content_list_id}"
        )
        content_list_record.content_list_owner_id = event_args._contentListOwnerId
        content_list_record.is_private = event_args._isPrivate
        content_list_record.is_album = event_args._isAlbum

        content_list_content_array = []
        for digital_content_id in event_args._digitalContentIds:
            content_list_content_array.append(
                {"digital_content": digital_content_id, "time": block_integer_time}
            )

        content_list_record.content_list_contents = {"digital_content_ids": content_list_content_array}
        content_list_record.created_at = block_datetime

    if event_type == content_list_event_types_lookup["content_list_deleted"]:
        logger.info(
            f"index.py | contentLists.py | Deleting contentList {content_list_record.content_list_id}"
        )
        content_list_record.is_delete = True

    if event_type == content_list_event_types_lookup["content_list_digital_content_added"]:
        if getattr(content_list_record, "content_list_contents") is not None:
            logger.info(
                f"index.py | contentLists.py | Adding digital_content {event_args._addedDigitalContentId} to contentList \
            {content_list_record.content_list_id}"
            )
            old_content_list_content_array = content_list_record.content_list_contents["digital_content_ids"]
            new_content_list_content_array = old_content_list_content_array
            # Append new digital_content object
            new_content_list_content_array.append(
                {"digital_content": event_args._addedDigitalContentId, "time": block_integer_time}
            )
            content_list_record.content_list_contents = {
                "digital_content_ids": new_content_list_content_array
            }
            content_list_record.timestamp = block_datetime
            content_list_record.last_added_to = block_datetime

    if event_type == content_list_event_types_lookup["content_list_digital_content_deleted"]:
        if getattr(content_list_record, "content_list_contents") is not None:
            logger.info(
                f"index.py | contentLists.py | Removing digital_content {event_args._deletedDigitalContentId} from \
            contentList {content_list_record.content_list_id}"
            )
            old_content_list_content_array = content_list_record.content_list_contents["digital_content_ids"]
            new_content_list_content_array = []
            deleted_digital_content_id = event_args._deletedDigitalContentId
            deleted_digital_content_timestamp = int(event_args._deletedDigitalContentTimestamp)
            delete_digital_content_entry_found = False
            for digital_content_entry in old_content_list_content_array:
                if (
                    digital_content_entry["digital_content"] == deleted_digital_content_id
                    and digital_content_entry["time"] == deleted_digital_content_timestamp
                    and not delete_digital_content_entry_found
                ):
                    delete_digital_content_entry_found = True
                    continue
                new_content_list_content_array.append(digital_content_entry)

            content_list_record.content_list_contents = {
                "digital_content_ids": new_content_list_content_array
            }

    if event_type == content_list_event_types_lookup["content_list_digital_contents_ordered"]:
        if getattr(content_list_record, "content_list_contents") is not None:
            logger.info(
                f"index.py | contentLists.py | Ordering contentList {content_list_record.content_list_id}"
            )
            old_content_list_content_array = content_list_record.content_list_contents["digital_content_ids"]

            intermediate_digital_content_time_lookup_dict = {}

            for old_content_list_entry in old_content_list_content_array:
                digital_content_id = old_content_list_entry["digital_content"]
                digital_content_time = old_content_list_entry["time"]

                if digital_content_id not in intermediate_digital_content_time_lookup_dict:
                    intermediate_digital_content_time_lookup_dict[digital_content_id] = []

                intermediate_digital_content_time_lookup_dict[digital_content_id].append(digital_content_time)

            content_list_content_array = []
            for digital_content_id in event_args._orderedDigitalContentIds:
                if digital_content_id in intermediate_digital_content_time_lookup_dict:
                    digital_content_time_array_length = len(
                        intermediate_digital_content_time_lookup_dict[digital_content_id]
                    )
                    if digital_content_time_array_length > 1:
                        digital_content_time = intermediate_digital_content_time_lookup_dict[digital_content_id].pop(
                            0
                        )
                    elif digital_content_time_array_length == 1:
                        digital_content_time = intermediate_digital_content_time_lookup_dict[digital_content_id][0]
                    else:
                        digital_content_time = block_integer_time
                else:
                    logger.info(
                        f"index.py | contentList.py | DigitalContent {digital_content_id} not found, using digital_content_time={block_integer_time}"
                    )
                    digital_content_time = block_integer_time
                content_list_content_array.append({"digital_content": digital_content_id, "time": digital_content_time})

            content_list_record.content_list_contents = {"digital_content_ids": content_list_content_array}

    if event_type == content_list_event_types_lookup["content_list_name_updated"]:
        logger.info(
            f"index.py | contentLists.py | Updating contentList {content_list_record.content_list_id} name \
        to {event_args._updatedContentListName}"
        )
        content_list_record.content_list_name = event_args._updatedContentListName

    if event_type == content_list_event_types_lookup["content_list_privacy_updated"]:
        logger.info(
            f"index.py | contentLists.py | Updating contentList {content_list_record.content_list_id} \
        privacy to {event_args._updatedIsPrivate}"
        )
        content_list_record.is_private = event_args._updatedIsPrivate

    if event_type == content_list_event_types_lookup["content_list_cover_photo_updated"]:
        content_list_record.content_list_image_multihash = helpers.multihash_digest_to_cid(
            event_args._contentListImageMultihashDigest
        )

        # All incoming contentList images are set to ipfs dir in column content_list_image_sizes_multihash
        if content_list_record.content_list_image_multihash:
            logger.info(
                f"index.py | contentLists.py | Processing contentList image \
            {content_list_record.content_list_image_multihash}"
            )
            content_list_record.content_list_image_sizes_multihash = (
                content_list_record.content_list_image_multihash
            )
            content_list_record.content_list_image_multihash = None

    if event_type == content_list_event_types_lookup["content_list_description_updated"]:
        logger.info(
            f"index.py | contentLists.py | Updating contentList {content_list_record.content_list_id} \
        description to {event_args._contentListDescription}"
        )
        content_list_record.description = event_args._contentListDescription

    if event_type == content_list_event_types_lookup["content_list_upc_updated"]:
        logger.info(
            f"index.py | contentLists.py | Updating contentList {content_list_record.content_list_id} UPC \
        to {event_args._contentListUPC}"
        )
        content_list_record.upc = helpers.bytes32_to_str(event_args._contentListUPC)

    content_list_record.updated_at = block_datetime

    if not all_required_fields_present(ContentList, content_list_record):
        raise EntityMissingRequiredFieldError(
            "content_list",
            content_list_record,
            f"Error parsing contentList {content_list_record} with entity missing required field(s)",
        )

    return content_list_record
