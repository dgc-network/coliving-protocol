import logging
from datetime import datetime
from typing import Dict, Set, Tuple

from sqlalchemy.orm.session import Session
from src.challenges.challenge_event import ChallengeEvent
from src.challenges.challenge_event_bus import ChallengeEventBus
from src.database_task import DatabaseTask
from src.models.content_lists.content_list import ContentList
from src.models.social.save import Save, SaveType
from src.utils.indexing_errors import IndexingError

logger = logging.getLogger(__name__)


def user_library_state_update(
    self,
    update_task: DatabaseTask,
    session: Session,
    user_library_factory_txs,
    block_number,
    block_timestamp,
    block_hash,
    _ipfs_metadata,  # prefix unused args with underscore to prevent pylint
) -> Tuple[int, Set]:
    """Return Tuple containing int representing number of User Library model state changes found in transaction and empty Set (to align with fn signature of other _state_update functions."""
    empty_set: Set[int] = set()
    num_total_changes = 0
    if not user_library_factory_txs:
        return num_total_changes, empty_set

    challenge_bus = update_task.challenge_event_bus
    block_datetime = datetime.utcfromtimestamp(block_timestamp)

    digital_content_save_state_changes: Dict[int, Dict[int, Save]] = {}
    content_list_save_state_changes: Dict[int, Dict[int, Save]] = {}

    for tx_receipt in user_library_factory_txs:
        try:
            add_digital_content_save(
                self,
                update_task.user_library_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                digital_content_save_state_changes,
            )

            add_content_list_save(
                self,
                update_task.user_library_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                content_list_save_state_changes,
            )

            delete_digital_content_save(
                self,
                update_task.user_library_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                digital_content_save_state_changes,
            )

            delete_content_list_save(
                self,
                update_task.user_library_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                content_list_save_state_changes,
            )
        except Exception as e:
            logger.info("Error in user library transaction")
            txhash = update_task.web3.toHex(tx_receipt.transactionHash)
            blockhash = update_task.web3.toHex(block_hash)
            raise IndexingError(
                "user_library", block_number, blockhash, txhash, str(e)
            ) from e

    for user_id, digital_content_ids in digital_content_save_state_changes.items():
        for digital_content_id in digital_content_ids:
            invalidate_old_save(session, user_id, digital_content_id, SaveType.digital_content)
            save = digital_content_ids[digital_content_id]
            session.add(save)
            dispatch_favorite(challenge_bus, save, block_number)
        num_total_changes += len(digital_content_ids)

    for user_id, content_list_ids in content_list_save_state_changes.items():
        for content_list_id in content_list_ids:
            invalidate_old_save(
                session,
                user_id,
                content_list_id,
                content_list_ids[content_list_id].save_type,
            )
            save = content_list_ids[content_list_id]
            session.add(save)
            dispatch_favorite(challenge_bus, save, block_number)
        num_total_changes += len(content_list_ids)

    return num_total_changes, empty_set


# ####### HELPERS ####### #


def dispatch_favorite(bus: ChallengeEventBus, save, block_number):
    bus.dispatch(ChallengeEvent.favorite, block_number, save.user_id)


def invalidate_old_save(session, user_id, content_list_id, save_type):
    num_invalidated_save_entries = (
        session.query(Save)
        .filter(
            Save.user_id == user_id,
            Save.save_item_id == content_list_id,
            Save.save_type == save_type,
            Save.is_current == True,
        )
        .update({"is_current": False})
    )
    return num_invalidated_save_entries


def add_digital_content_save(
    self,
    user_library_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    digital_content_state_changes: Dict[int, Dict[int, Save]],
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_add_digital_content_events = (
        update_task.user_library_contract.events.DigitalContentSaveAdded().processReceipt(
            tx_receipt
        )
    )

    for event in new_add_digital_content_events:
        event_args = event["args"]
        save_user_id = event_args._userId
        save_digital_content_id = event_args._digitalContentId

        if (save_user_id in digital_content_state_changes) and (
            save_digital_content_id in digital_content_state_changes[save_user_id]
        ):
            digital_content_state_changes[save_user_id][save_digital_content_id].is_delete = False
        else:
            save = Save(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=save_user_id,
                save_item_id=save_digital_content_id,
                save_type=SaveType.digital_content,
                created_at=block_datetime,
                is_current=True,
                is_delete=False,
            )
            if save_user_id in digital_content_state_changes:
                digital_content_state_changes[save_user_id][save_digital_content_id] = save
            else:
                digital_content_state_changes[save_user_id] = {save_digital_content_id: save}


def add_content_list_save(
    self,
    user_library_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    content_list_state_changes,
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_add_content_list_events = (
        update_task.user_library_contract.events.ContentListSaveAdded().processReceipt(
            tx_receipt
        )
    )

    for event in new_add_content_list_events:
        event_args = event["args"]
        save_user_id = event_args._userId
        save_content_list_id = event_args._contentListId
        save_type = SaveType.contentList

        content_list_entry = (
            session.query(ContentList)
            .filter(
                ContentList.is_current == True, ContentList.content_list_id == save_content_list_id
            )
            .all()
        )

        if content_list_entry:
            if content_list_entry[0].is_album:
                save_type = SaveType.album

        if (save_user_id in content_list_state_changes) and (
            save_content_list_id in content_list_state_changes[save_user_id]
        ):
            content_list_state_changes[save_user_id][save_content_list_id].is_delete = False
        else:
            save = Save(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=save_user_id,
                save_item_id=save_content_list_id,
                save_type=save_type,
                created_at=block_datetime,
                is_current=True,
                is_delete=False,
            )
            if save_user_id in content_list_state_changes:
                content_list_state_changes[save_user_id][save_content_list_id] = save
            else:
                content_list_state_changes[save_user_id] = {save_content_list_id: save}


def delete_digital_content_save(
    self,
    user_library_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    digital_content_state_changes: Dict[int, Dict[int, Save]],
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_delete_digital_content_events = (
        update_task.user_library_contract.events.DigitalContentSaveDeleted().processReceipt(
            tx_receipt
        )
    )
    for event in new_delete_digital_content_events:
        event_args = event["args"]
        save_user_id = event_args._userId
        save_digital_content_id = event_args._digitalContentId

        if (save_user_id in digital_content_state_changes) and (
            save_digital_content_id in digital_content_state_changes[save_user_id]
        ):
            digital_content_state_changes[save_user_id][save_digital_content_id].is_delete = True
        else:
            save = Save(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=save_user_id,
                save_item_id=save_digital_content_id,
                save_type=SaveType.digital_content,
                created_at=block_datetime,
                is_current=True,
                is_delete=True,
            )
            if save_user_id in digital_content_state_changes:
                digital_content_state_changes[save_user_id][save_digital_content_id] = save
            else:
                digital_content_state_changes[save_user_id] = {save_digital_content_id: save}


def delete_content_list_save(
    self,
    user_library_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    content_list_state_changes: Dict[int, Dict[int, Save]],
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_add_content_list_events = (
        update_task.user_library_contract.events.ContentListSaveDeleted().processReceipt(
            tx_receipt
        )
    )

    for event in new_add_content_list_events:
        event_args = event["args"]
        save_user_id = event_args._userId
        save_content_list_id = event_args._contentListId
        save_type = SaveType.contentList

        content_list_entry = (
            session.query(ContentList)
            .filter(
                ContentList.is_current == True, ContentList.content_list_id == save_content_list_id
            )
            .all()
        )

        if content_list_entry:
            if content_list_entry[0].is_album:
                save_type = SaveType.album

        if (save_user_id in content_list_state_changes) and (
            save_content_list_id in content_list_state_changes[save_user_id]
        ):
            content_list_state_changes[save_user_id][save_content_list_id].is_delete = True
        else:
            save = Save(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=save_user_id,
                save_item_id=save_content_list_id,
                save_type=save_type,
                created_at=block_datetime,
                is_current=True,
                is_delete=True,
            )
            if save_user_id in content_list_state_changes:
                content_list_state_changes[save_user_id][save_content_list_id] = save
            else:
                content_list_state_changes[save_user_id] = {save_content_list_id: save}
