import logging
from datetime import datetime
from typing import Dict, Set, Tuple

from sqlalchemy.orm.session import Session
from src.challenges.challenge_event import ChallengeEvent
from src.challenges.challenge_event_bus import ChallengeEventBus
from src.database_task import DatabaseTask
from src.models.playlists.playlist import Playlist
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

    track_save_state_changes: Dict[int, Dict[int, Save]] = {}
    playlist_save_state_changes: Dict[int, Dict[int, Save]] = {}

    for tx_receipt in user_library_factory_txs:
        try:
            add_track_save(
                self,
                update_task.user_library_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                track_save_state_changes,
            )

            add_playlist_save(
                self,
                update_task.user_library_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                playlist_save_state_changes,
            )

            delete_track_save(
                self,
                update_task.user_library_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                track_save_state_changes,
            )

            delete_playlist_save(
                self,
                update_task.user_library_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                playlist_save_state_changes,
            )
        except Exception as e:
            logger.info("Error in user library transaction")
            txhash = update_task.web3.toHex(tx_receipt.transactionHash)
            blockhash = update_task.web3.toHex(block_hash)
            raise IndexingError(
                "user_library", block_number, blockhash, txhash, str(e)
            ) from e

    for user_id, track_ids in track_save_state_changes.items():
        for track_id in track_ids:
            invalidate_old_save(session, user_id, track_id, SaveType.track)
            save = track_ids[track_id]
            session.add(save)
            dispatch_favorite(challenge_bus, save, block_number)
        num_total_changes += len(track_ids)

    for user_id, playlist_ids in playlist_save_state_changes.items():
        for playlist_id in playlist_ids:
            invalidate_old_save(
                session,
                user_id,
                playlist_id,
                playlist_ids[playlist_id].save_type,
            )
            save = playlist_ids[playlist_id]
            session.add(save)
            dispatch_favorite(challenge_bus, save, block_number)
        num_total_changes += len(playlist_ids)

    return num_total_changes, empty_set


# ####### HELPERS ####### #


def dispatch_favorite(bus: ChallengeEventBus, save, block_number):
    bus.dispatch(ChallengeEvent.favorite, block_number, save.user_id)


def invalidate_old_save(session, user_id, playlist_id, save_type):
    num_invalidated_save_entries = (
        session.query(Save)
        .filter(
            Save.user_id == user_id,
            Save.save_item_id == playlist_id,
            Save.save_type == save_type,
            Save.is_current == True,
        )
        .update({"is_current": False})
    )
    return num_invalidated_save_entries


def add_track_save(
    self,
    user_library_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    track_state_changes: Dict[int, Dict[int, Save]],
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_add_track_events = (
        update_task.user_library_contract.events.TrackSaveAdded().processReceipt(
            tx_receipt
        )
    )

    for event in new_add_track_events:
        event_args = event["args"]
        save_user_id = event_args._userId
        save_track_id = event_args._trackId

        if (save_user_id in track_state_changes) and (
            save_track_id in track_state_changes[save_user_id]
        ):
            track_state_changes[save_user_id][save_track_id].is_delete = False
        else:
            save = Save(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=save_user_id,
                save_item_id=save_track_id,
                save_type=SaveType.track,
                created_at=block_datetime,
                is_current=True,
                is_delete=False,
            )
            if save_user_id in track_state_changes:
                track_state_changes[save_user_id][save_track_id] = save
            else:
                track_state_changes[save_user_id] = {save_track_id: save}


def add_playlist_save(
    self,
    user_library_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    playlist_state_changes,
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_add_playlist_events = (
        update_task.user_library_contract.events.PlaylistSaveAdded().processReceipt(
            tx_receipt
        )
    )

    for event in new_add_playlist_events:
        event_args = event["args"]
        save_user_id = event_args._userId
        save_playlist_id = event_args._playlistId
        save_type = SaveType.playlist

        playlist_entry = (
            session.query(Playlist)
            .filter(
                Playlist.is_current == True, Playlist.playlist_id == save_playlist_id
            )
            .all()
        )

        if playlist_entry:
            if playlist_entry[0].is_album:
                save_type = SaveType.album

        if (save_user_id in playlist_state_changes) and (
            save_playlist_id in playlist_state_changes[save_user_id]
        ):
            playlist_state_changes[save_user_id][save_playlist_id].is_delete = False
        else:
            save = Save(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=save_user_id,
                save_item_id=save_playlist_id,
                save_type=save_type,
                created_at=block_datetime,
                is_current=True,
                is_delete=False,
            )
            if save_user_id in playlist_state_changes:
                playlist_state_changes[save_user_id][save_playlist_id] = save
            else:
                playlist_state_changes[save_user_id] = {save_playlist_id: save}


def delete_track_save(
    self,
    user_library_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    track_state_changes: Dict[int, Dict[int, Save]],
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_delete_track_events = (
        update_task.user_library_contract.events.TrackSaveDeleted().processReceipt(
            tx_receipt
        )
    )
    for event in new_delete_track_events:
        event_args = event["args"]
        save_user_id = event_args._userId
        save_track_id = event_args._trackId

        if (save_user_id in track_state_changes) and (
            save_track_id in track_state_changes[save_user_id]
        ):
            track_state_changes[save_user_id][save_track_id].is_delete = True
        else:
            save = Save(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=save_user_id,
                save_item_id=save_track_id,
                save_type=SaveType.track,
                created_at=block_datetime,
                is_current=True,
                is_delete=True,
            )
            if save_user_id in track_state_changes:
                track_state_changes[save_user_id][save_track_id] = save
            else:
                track_state_changes[save_user_id] = {save_track_id: save}


def delete_playlist_save(
    self,
    user_library_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    playlist_state_changes: Dict[int, Dict[int, Save]],
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_add_playlist_events = (
        update_task.user_library_contract.events.PlaylistSaveDeleted().processReceipt(
            tx_receipt
        )
    )

    for event in new_add_playlist_events:
        event_args = event["args"]
        save_user_id = event_args._userId
        save_playlist_id = event_args._playlistId
        save_type = SaveType.playlist

        playlist_entry = (
            session.query(Playlist)
            .filter(
                Playlist.is_current == True, Playlist.playlist_id == save_playlist_id
            )
            .all()
        )

        if playlist_entry:
            if playlist_entry[0].is_album:
                save_type = SaveType.album

        if (save_user_id in playlist_state_changes) and (
            save_playlist_id in playlist_state_changes[save_user_id]
        ):
            playlist_state_changes[save_user_id][save_playlist_id].is_delete = True
        else:
            save = Save(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=save_user_id,
                save_item_id=save_playlist_id,
                save_type=save_type,
                created_at=block_datetime,
                is_current=True,
                is_delete=True,
            )
            if save_user_id in playlist_state_changes:
                playlist_state_changes[save_user_id][save_playlist_id] = save
            else:
                playlist_state_changes[save_user_id] = {save_playlist_id: save}
