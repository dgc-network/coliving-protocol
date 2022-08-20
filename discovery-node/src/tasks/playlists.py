import logging
from datetime import datetime
from typing import Any, Dict, Set, Tuple

from sqlalchemy.orm.session import Session, make_transient
from src.challenges.challenge_event import ChallengeEvent
from src.database_task import DatabaseTask
from src.models.content lists.content list import ContentList
from src.queries.skipped_transactions import add_node_level_skipped_transaction
from src.utils import helpers
from src.utils.indexing_errors import EntityMissingRequiredFieldError, IndexingError
from src.utils.model_nullable_validator import all_required_fields_present
from src.utils.content list_event_constants import (
    content list_event_types_arr,
    content list_event_types_lookup,
)

logger = logging.getLogger(__name__)


def content list_state_update(
    self,
    update_task: DatabaseTask,
    session: Session,
    content list_factory_txs,
    block_number,
    block_timestamp,
    block_hash,
    _ipfs_metadata,  # prefix unused args with underscore to prevent pylint
) -> Tuple[int, Set]:
    """Return Tuple containing int representing number of ContentList model state changes found in transaction and set of processed content list IDs."""
    blockhash = update_task.web3.toHex(block_hash)
    num_total_changes = 0
    skipped_tx_count = 0
    # This stores the content list_ids created or updated in the set of transactions
    content list_ids: Set[int] = set()

    challenge_bus = update_task.challenge_event_bus

    if not content list_factory_txs:
        return num_total_changes, content list_ids

    content list_events_lookup: Dict[int, Dict[str, Any]] = {}
    for tx_receipt in content list_factory_txs:
        txhash = update_task.web3.toHex(tx_receipt.transactionHash)
        for event_type in content list_event_types_arr:
            content list_events_tx = get_content list_events_tx(
                update_task, event_type, tx_receipt
            )
            processedEntries = 0  # if record does not get added, do not count towards num_total_changes
            for entry in content list_events_tx:
                existing_content list_record = None
                content list_id = helpers.get_tx_arg(entry, "_content listId")
                try:
                    # look up or populate existing record
                    if content list_id in content list_events_lookup:
                        existing_content list_record = content list_events_lookup[content list_id][
                            "content list"
                        ]
                    else:
                        existing_content list_record = lookup_content list_record(
                            update_task, session, entry, block_number, txhash
                        )

                    # parse content list event to add metadata to record
                    content list_record = parse_content list_event(
                        self,
                        update_task,
                        entry,
                        event_type,
                        existing_content list_record,
                        block_timestamp,
                        session,
                    )

                    # process content list record
                    if content list_record is not None:
                        if content list_id not in content list_events_lookup:
                            content list_events_lookup[content list_id] = {
                                "content list": content list_record,
                                "events": [],
                            }
                        else:
                            content list_events_lookup[content list_id][
                                "content list"
                            ] = content list_record
                        content list_events_lookup[content list_id]["events"].append(event_type)
                        content list_ids.add(content list_id)
                        processedEntries += 1
                except EntityMissingRequiredFieldError as e:
                    logger.warning(f"Skipping tx {txhash} with error {e}")
                    skipped_tx_count += 1
                    add_node_level_skipped_transaction(
                        session, block_number, blockhash, txhash
                    )
                    pass
                except Exception as e:
                    logger.info("Error in parse content list transaction")
                    raise IndexingError(
                        "content list", block_number, blockhash, txhash, str(e)
                    ) from e
            num_total_changes += processedEntries

    logger.info(
        f"index.py | content lists.py | There are {num_total_changes} events processed and {skipped_tx_count} skipped transactions."
    )

    for content list_id, value_obj in content list_events_lookup.items():
        logger.info(f"index.py | content lists.py | Adding {value_obj['content list']})")
        if value_obj["events"]:
            invalidate_old_content list(session, content list_id)
            session.add(value_obj["content list"])
            if (
                content list_event_types_lookup["content list_agreement_added"]
                in value_obj["events"]
            ):
                challenge_bus.dispatch(
                    ChallengeEvent.first_content list,
                    value_obj["content list"].blocknumber,
                    value_obj["content list"].content list_owner_id,
                )

    return num_total_changes, content list_ids


def get_content list_events_tx(update_task, event_type, tx_receipt):
    return getattr(update_task.content list_contract.events, event_type)().processReceipt(
        tx_receipt
    )


def lookup_content list_record(update_task, session, entry, block_number, txhash):
    event_blockhash = update_task.web3.toHex(entry.blockHash)
    event_args = entry["args"]
    content list_id = event_args._content listId

    # Check if content list record is in the DB
    content list_exists = (
        session.query(ContentList).filter_by(content list_id=event_args._content listId).count()
        > 0
    )

    content list_record = None
    if content list_exists:
        content list_record = (
            session.query(ContentList)
            .filter(ContentList.content list_id == content list_id, ContentList.is_current == True)
            .first()
        )

        # expunge the result from sqlalchemy so we can modify it without UPDATE statements being made
        # https://stackoverflow.com/questions/28871406/how-to-clone-a-sqlalchemy-db-object-with-new-primary-key
        session.expunge(content list_record)
        make_transient(content list_record)
    else:
        content list_record = ContentList(
            content list_id=content list_id, is_current=True, is_delete=False
        )

    # update these fields regardless of type
    content list_record.blocknumber = block_number
    content list_record.blockhash = event_blockhash
    content list_record.txhash = txhash

    return content list_record


def invalidate_old_content list(session, content list_id):
    # check if content list id is in db
    content list_exists = (
        session.query(ContentList).filter_by(content list_id=content list_id).count() > 0
    )

    if content list_exists:
        # Update existing record in db to is_current = False
        num_invalidated_content lists = (
            session.query(ContentList)
            .filter(ContentList.content list_id == content list_id, ContentList.is_current == True)
            .update({"is_current": False})
        )
        assert (
            num_invalidated_content lists > 0
        ), "Update operation requires a current content list to be invalidated"


def parse_content list_event(
    self, update_task, entry, event_type, content list_record, block_timestamp, session
):
    event_args = entry["args"]
    # Just use block_timestamp as integer
    block_datetime = datetime.utcfromtimestamp(block_timestamp)
    block_integer_time = int(block_timestamp)

    if event_type == content list_event_types_lookup["content list_created"]:
        logger.info(
            f"index.py | content lists.py | Creating content list {content list_record.content list_id}"
        )
        content list_record.content list_owner_id = event_args._content listOwnerId
        content list_record.is_private = event_args._isPrivate
        content list_record.is_album = event_args._isAlbum

        content list_content_array = []
        for agreement_id in event_args._agreementIds:
            content list_content_array.append(
                {"agreement": agreement_id, "time": block_integer_time}
            )

        content list_record.content list_contents = {"agreement_ids": content list_content_array}
        content list_record.created_at = block_datetime

    if event_type == content list_event_types_lookup["content list_deleted"]:
        logger.info(
            f"index.py | content lists.py | Deleting content list {content list_record.content list_id}"
        )
        content list_record.is_delete = True

    if event_type == content list_event_types_lookup["content list_agreement_added"]:
        if getattr(content list_record, "content list_contents") is not None:
            logger.info(
                f"index.py | content lists.py | Adding agreement {event_args._addedAgreementId} to content list \
            {content list_record.content list_id}"
            )
            old_content list_content_array = content list_record.content list_contents["agreement_ids"]
            new_content list_content_array = old_content list_content_array
            # Append new agreement object
            new_content list_content_array.append(
                {"agreement": event_args._addedAgreementId, "time": block_integer_time}
            )
            content list_record.content list_contents = {
                "agreement_ids": new_content list_content_array
            }
            content list_record.timestamp = block_datetime
            content list_record.last_added_to = block_datetime

    if event_type == content list_event_types_lookup["content list_agreement_deleted"]:
        if getattr(content list_record, "content list_contents") is not None:
            logger.info(
                f"index.py | content lists.py | Removing agreement {event_args._deletedAgreementId} from \
            content list {content list_record.content list_id}"
            )
            old_content list_content_array = content list_record.content list_contents["agreement_ids"]
            new_content list_content_array = []
            deleted_agreement_id = event_args._deletedAgreementId
            deleted_agreement_timestamp = int(event_args._deletedAgreementTimestamp)
            delete_agreement_entry_found = False
            for agreement_entry in old_content list_content_array:
                if (
                    agreement_entry["agreement"] == deleted_agreement_id
                    and agreement_entry["time"] == deleted_agreement_timestamp
                    and not delete_agreement_entry_found
                ):
                    delete_agreement_entry_found = True
                    continue
                new_content list_content_array.append(agreement_entry)

            content list_record.content list_contents = {
                "agreement_ids": new_content list_content_array
            }

    if event_type == content list_event_types_lookup["content list_agreements_ordered"]:
        if getattr(content list_record, "content list_contents") is not None:
            logger.info(
                f"index.py | content lists.py | Ordering content list {content list_record.content list_id}"
            )
            old_content list_content_array = content list_record.content list_contents["agreement_ids"]

            intermediate_agreement_time_lookup_dict = {}

            for old_content list_entry in old_content list_content_array:
                agreement_id = old_content list_entry["agreement"]
                agreement_time = old_content list_entry["time"]

                if agreement_id not in intermediate_agreement_time_lookup_dict:
                    intermediate_agreement_time_lookup_dict[agreement_id] = []

                intermediate_agreement_time_lookup_dict[agreement_id].append(agreement_time)

            content list_content_array = []
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
                        f"index.py | content list.py | Agreement {agreement_id} not found, using agreement_time={block_integer_time}"
                    )
                    agreement_time = block_integer_time
                content list_content_array.append({"agreement": agreement_id, "time": agreement_time})

            content list_record.content list_contents = {"agreement_ids": content list_content_array}

    if event_type == content list_event_types_lookup["content list_name_updated"]:
        logger.info(
            f"index.py | content lists.py | Updating content list {content list_record.content list_id} name \
        to {event_args._updatedContentListName}"
        )
        content list_record.content list_name = event_args._updatedContentListName

    if event_type == content list_event_types_lookup["content list_privacy_updated"]:
        logger.info(
            f"index.py | content lists.py | Updating content list {content list_record.content list_id} \
        privacy to {event_args._updatedIsPrivate}"
        )
        content list_record.is_private = event_args._updatedIsPrivate

    if event_type == content list_event_types_lookup["content list_cover_photo_updated"]:
        content list_record.content list_image_multihash = helpers.multihash_digest_to_cid(
            event_args._content listImageMultihashDigest
        )

        # All incoming content list images are set to ipfs dir in column content list_image_sizes_multihash
        if content list_record.content list_image_multihash:
            logger.info(
                f"index.py | content lists.py | Processing content list image \
            {content list_record.content list_image_multihash}"
            )
            content list_record.content list_image_sizes_multihash = (
                content list_record.content list_image_multihash
            )
            content list_record.content list_image_multihash = None

    if event_type == content list_event_types_lookup["content list_description_updated"]:
        logger.info(
            f"index.py | content lists.py | Updating content list {content list_record.content list_id} \
        description to {event_args._content listDescription}"
        )
        content list_record.description = event_args._content listDescription

    if event_type == content list_event_types_lookup["content list_upc_updated"]:
        logger.info(
            f"index.py | content lists.py | Updating content list {content list_record.content list_id} UPC \
        to {event_args._content listUPC}"
        )
        content list_record.upc = helpers.bytes32_to_str(event_args._content listUPC)

    content list_record.updated_at = block_datetime

    if not all_required_fields_present(ContentList, content list_record):
        raise EntityMissingRequiredFieldError(
            "content list",
            content list_record,
            f"Error parsing content list {content list_record} with entity missing required field(s)",
        )

    return content list_record
