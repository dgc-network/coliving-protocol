import logging
from datetime import datetime
from typing import Dict, Set, Tuple

from sqlalchemy.orm.session import Session
from src.challenges.challenge_event import ChallengeEvent
from src.challenges.challenge_event_bus import ChallengeEventBus
from src.database_task import DatabaseTask
from src.models.contentLists.contentList import ContentList
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

    agreement_save_state_changes: Dict[int, Dict[int, Save]] = {}
    contentList_save_state_changes: Dict[int, Dict[int, Save]] = {}

    for tx_receipt in user_library_factory_txs:
        try:
            add_agreement_save(
                self,
                update_task.user_library_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                agreement_save_state_changes,
            )

            add_contentList_save(
                self,
                update_task.user_library_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                contentList_save_state_changes,
            )

            delete_agreement_save(
                self,
                update_task.user_library_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                agreement_save_state_changes,
            )

            delete_contentList_save(
                self,
                update_task.user_library_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                contentList_save_state_changes,
            )
        except Exception as e:
            logger.info("Error in user library transaction")
            txhash = update_task.web3.toHex(tx_receipt.transactionHash)
            blockhash = update_task.web3.toHex(block_hash)
            raise IndexingError(
                "user_library", block_number, blockhash, txhash, str(e)
            ) from e

    for user_id, agreement_ids in agreement_save_state_changes.items():
        for agreement_id in agreement_ids:
            invalidate_old_save(session, user_id, agreement_id, SaveType.agreement)
            save = agreement_ids[agreement_id]
            session.add(save)
            dispatch_favorite(challenge_bus, save, block_number)
        num_total_changes += len(agreement_ids)

    for user_id, contentList_ids in contentList_save_state_changes.items():
        for contentList_id in contentList_ids:
            invalidate_old_save(
                session,
                user_id,
                contentList_id,
                contentList_ids[contentList_id].save_type,
            )
            save = contentList_ids[contentList_id]
            session.add(save)
            dispatch_favorite(challenge_bus, save, block_number)
        num_total_changes += len(contentList_ids)

    return num_total_changes, empty_set


# ####### HELPERS ####### #


def dispatch_favorite(bus: ChallengeEventBus, save, block_number):
    bus.dispatch(ChallengeEvent.favorite, block_number, save.user_id)


def invalidate_old_save(session, user_id, contentList_id, save_type):
    num_invalidated_save_entries = (
        session.query(Save)
        .filter(
            Save.user_id == user_id,
            Save.save_item_id == contentList_id,
            Save.save_type == save_type,
            Save.is_current == True,
        )
        .update({"is_current": False})
    )
    return num_invalidated_save_entries


def add_agreement_save(
    self,
    user_library_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    agreement_state_changes: Dict[int, Dict[int, Save]],
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_add_agreement_events = (
        update_task.user_library_contract.events.AgreementSaveAdded().processReceipt(
            tx_receipt
        )
    )

    for event in new_add_agreement_events:
        event_args = event["args"]
        save_user_id = event_args._userId
        save_agreement_id = event_args._agreementId

        if (save_user_id in agreement_state_changes) and (
            save_agreement_id in agreement_state_changes[save_user_id]
        ):
            agreement_state_changes[save_user_id][save_agreement_id].is_delete = False
        else:
            save = Save(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=save_user_id,
                save_item_id=save_agreement_id,
                save_type=SaveType.agreement,
                created_at=block_datetime,
                is_current=True,
                is_delete=False,
            )
            if save_user_id in agreement_state_changes:
                agreement_state_changes[save_user_id][save_agreement_id] = save
            else:
                agreement_state_changes[save_user_id] = {save_agreement_id: save}


def add_contentList_save(
    self,
    user_library_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    contentList_state_changes,
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_add_contentList_events = (
        update_task.user_library_contract.events.ContentListSaveAdded().processReceipt(
            tx_receipt
        )
    )

    for event in new_add_contentList_events:
        event_args = event["args"]
        save_user_id = event_args._userId
        save_contentList_id = event_args._contentListId
        save_type = SaveType.contentList

        contentList_entry = (
            session.query(ContentList)
            .filter(
                ContentList.is_current == True, ContentList.contentList_id == save_contentList_id
            )
            .all()
        )

        if contentList_entry:
            if contentList_entry[0].is_album:
                save_type = SaveType.album

        if (save_user_id in contentList_state_changes) and (
            save_contentList_id in contentList_state_changes[save_user_id]
        ):
            contentList_state_changes[save_user_id][save_contentList_id].is_delete = False
        else:
            save = Save(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=save_user_id,
                save_item_id=save_contentList_id,
                save_type=save_type,
                created_at=block_datetime,
                is_current=True,
                is_delete=False,
            )
            if save_user_id in contentList_state_changes:
                contentList_state_changes[save_user_id][save_contentList_id] = save
            else:
                contentList_state_changes[save_user_id] = {save_contentList_id: save}


def delete_agreement_save(
    self,
    user_library_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    agreement_state_changes: Dict[int, Dict[int, Save]],
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_delete_agreement_events = (
        update_task.user_library_contract.events.AgreementSaveDeleted().processReceipt(
            tx_receipt
        )
    )
    for event in new_delete_agreement_events:
        event_args = event["args"]
        save_user_id = event_args._userId
        save_agreement_id = event_args._agreementId

        if (save_user_id in agreement_state_changes) and (
            save_agreement_id in agreement_state_changes[save_user_id]
        ):
            agreement_state_changes[save_user_id][save_agreement_id].is_delete = True
        else:
            save = Save(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=save_user_id,
                save_item_id=save_agreement_id,
                save_type=SaveType.agreement,
                created_at=block_datetime,
                is_current=True,
                is_delete=True,
            )
            if save_user_id in agreement_state_changes:
                agreement_state_changes[save_user_id][save_agreement_id] = save
            else:
                agreement_state_changes[save_user_id] = {save_agreement_id: save}


def delete_contentList_save(
    self,
    user_library_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    contentList_state_changes: Dict[int, Dict[int, Save]],
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_add_contentList_events = (
        update_task.user_library_contract.events.ContentListSaveDeleted().processReceipt(
            tx_receipt
        )
    )

    for event in new_add_contentList_events:
        event_args = event["args"]
        save_user_id = event_args._userId
        save_contentList_id = event_args._contentListId
        save_type = SaveType.contentList

        contentList_entry = (
            session.query(ContentList)
            .filter(
                ContentList.is_current == True, ContentList.contentList_id == save_contentList_id
            )
            .all()
        )

        if contentList_entry:
            if contentList_entry[0].is_album:
                save_type = SaveType.album

        if (save_user_id in contentList_state_changes) and (
            save_contentList_id in contentList_state_changes[save_user_id]
        ):
            contentList_state_changes[save_user_id][save_contentList_id].is_delete = True
        else:
            save = Save(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=save_user_id,
                save_item_id=save_contentList_id,
                save_type=save_type,
                created_at=block_datetime,
                is_current=True,
                is_delete=True,
            )
            if save_user_id in contentList_state_changes:
                contentList_state_changes[save_user_id][save_contentList_id] = save
            else:
                contentList_state_changes[save_user_id] = {save_contentList_id: save}
