import logging
from datetime import datetime
from typing import Dict, Set, Tuple

from sqlalchemy.orm.session import Session
from src.challenges.challenge_event import ChallengeEvent
from src.challenges.challenge_event_bus import ChallengeEventBus
from src.database_task import DatabaseTask
from src.models.playlists.playlist import Playlist
from src.models.social.follow import Follow
from src.models.social.repost import Repost, RepostType
from src.utils.indexing_errors import IndexingError

logger = logging.getLogger(__name__)


def social_feature_state_update(
    self,
    update_task: DatabaseTask,
    session: Session,
    social_feature_factory_txs,
    block_number,
    block_timestamp,
    block_hash,
    _ipfs_metadata,  # prefix unused args with underscore to prevent pylint
) -> Tuple[int, Set]:
    """Return Tuple containing int representing number of social feature related state changes in this transaction and empty Set (to align with other _state_update function signatures)"""
    empty_set: Set[int] = set()
    num_total_changes = 0
    if not social_feature_factory_txs:
        return num_total_changes, empty_set

    challenge_bus = update_task.challenge_event_bus
    block_datetime = datetime.utcfromtimestamp(block_timestamp)

    # stores net state changes of all reposts and follows and corresponding events in current block
    #   track_repost_state_changes = { "user_id": { "track_id": {__Repost__} } }
    #   playlist_repost_state_changes = { "user_id": { "playlist_id": {__Repost__} } }
    #   follow_state_changes = { "follower_user_id": { "followee_user_id": {__Follow__} } }
    track_repost_state_changes: Dict[int, Dict[int, Repost]] = {}
    playlist_repost_state_changes: Dict[int, Dict[int, Repost]] = {}
    follow_state_changes: Dict[int, Dict[int, Follow]] = {}

    for tx_receipt in social_feature_factory_txs:
        try:
            add_track_repost(
                self,
                update_task.social_feature_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                track_repost_state_changes,
            )
            delete_track_repost(
                self,
                update_task.social_feature_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                track_repost_state_changes,
            )
            add_playlist_repost(
                self,
                update_task.social_feature_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                playlist_repost_state_changes,
            )
            delete_playlist_repost(
                self,
                update_task.social_feature_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                playlist_repost_state_changes,
            )
            add_follow(
                self,
                update_task.social_feature_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                follow_state_changes,
            )
            delete_follow(
                self,
                update_task.social_feature_contract,
                update_task,
                session,
                tx_receipt,
                block_number,
                block_datetime,
                follow_state_changes,
            )
        except Exception as e:
            logger.info("Error in parse track transaction")
            txhash = update_task.web3.toHex(tx_receipt.transactionHash)
            blockhash = update_task.web3.toHex(block_hash)
            raise IndexingError(
                "social_feature", block_number, blockhash, txhash, str(e)
            ) from e

    # bulk process all repost and follow changes

    for repost_user_id, repost_track_ids in track_repost_state_changes.items():
        for repost_track_id in repost_track_ids:
            invalidate_old_repost(
                session, repost_user_id, repost_track_id, RepostType.track
            )
            repost = repost_track_ids[repost_track_id]
            session.add(repost)
            dispatch_challenge_repost(challenge_bus, repost, block_number)
        num_total_changes += len(repost_track_ids)

    for repost_user_id, repost_playlist_ids in playlist_repost_state_changes.items():
        for repost_playlist_id in repost_playlist_ids:
            invalidate_old_repost(
                session,
                repost_user_id,
                repost_playlist_id,
                repost_playlist_ids[repost_playlist_id].repost_type,
            )
            repost = repost_playlist_ids[repost_playlist_id]
            session.add(repost)
            dispatch_challenge_repost(challenge_bus, repost, block_number)
        num_total_changes += len(repost_playlist_ids)

    for follower_user_id, followee_user_ids in follow_state_changes.items():
        for followee_user_id in followee_user_ids:
            invalidate_old_follow(session, follower_user_id, followee_user_id)
            follow = followee_user_ids[followee_user_id]
            session.add(follow)
            dispatch_challenge_follow(challenge_bus, follow, block_number)
        num_total_changes += len(followee_user_ids)
    return num_total_changes, empty_set


# ####### HELPERS ####### #


def dispatch_challenge_repost(bus: ChallengeEventBus, repost, block_number):
    bus.dispatch(ChallengeEvent.repost, block_number, repost.user_id)


def dispatch_challenge_follow(bus: ChallengeEventBus, follow, block_number):
    bus.dispatch(ChallengeEvent.follow, block_number, follow.follower_user_id)


def invalidate_old_repost(session, repost_user_id, repost_item_id, repost_type):
    # update existing db entry to is_current = False
    num_invalidated_repost_entries = (
        session.query(Repost)
        .filter(
            Repost.user_id == repost_user_id,
            Repost.repost_item_id == repost_item_id,
            Repost.repost_type == repost_type,
            Repost.is_current == True,
        )
        .update({"is_current": False})
    )
    # TODO - after on-chain storage is implemented, assert num_invalidated_repost_entries > 0
    return num_invalidated_repost_entries


def invalidate_old_follow(session, follower_user_id, followee_user_id):
    # update existing db entry to is_current = False
    num_invalidated_follow_entries = (
        session.query(Follow)
        .filter(
            Follow.follower_user_id == follower_user_id,
            Follow.followee_user_id == followee_user_id,
            Follow.is_current == True,
        )
        .update({"is_current": False})
    )
    # TODO - after on-chain storage is implemented, assert num_invalidated_follow_entries > 0
    return num_invalidated_follow_entries


def add_track_repost(
    self,
    social_feature_factory_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    track_repost_state_changes,
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_track_repost_events = (
        social_feature_factory_contract.events.TrackRepostAdded().processReceipt(
            tx_receipt
        )
    )
    for event in new_track_repost_events:
        event_args = event["args"]
        repost_user_id = event_args._userId
        repost_track_id = event_args._trackId

        if (repost_user_id in track_repost_state_changes) and (
            repost_track_id in track_repost_state_changes[repost_user_id]
        ):
            track_repost_state_changes[repost_user_id][
                repost_track_id
            ].is_delete = False
        else:
            repost = Repost(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=repost_user_id,
                repost_item_id=repost_track_id,
                repost_type=RepostType.track,
                is_current=True,
                is_delete=False,
                created_at=block_datetime,
            )
            if repost_user_id in track_repost_state_changes:
                track_repost_state_changes[repost_user_id][repost_track_id] = repost
            else:
                track_repost_state_changes[repost_user_id] = {repost_track_id: repost}


def delete_track_repost(
    self,
    social_feature_factory_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    track_repost_state_changes,
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_repost_events = (
        social_feature_factory_contract.events.TrackRepostDeleted().processReceipt(
            tx_receipt
        )
    )
    for event in new_repost_events:
        event_args = event["args"]
        repost_user_id = event_args._userId
        repost_track_id = event_args._trackId

        if (repost_user_id in track_repost_state_changes) and (
            repost_track_id in track_repost_state_changes[repost_user_id]
        ):
            track_repost_state_changes[repost_user_id][repost_track_id].is_delete = True
        else:
            repost = Repost(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=repost_user_id,
                repost_item_id=repost_track_id,
                repost_type=RepostType.track,
                is_current=True,
                is_delete=True,
                created_at=block_datetime,
            )
            if repost_user_id in track_repost_state_changes:
                track_repost_state_changes[repost_user_id][repost_track_id] = repost
            else:
                track_repost_state_changes[repost_user_id] = {repost_track_id: repost}


def add_playlist_repost(
    self,
    social_feature_factory_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    playlist_repost_state_changes,
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_playlist_repost_events = (
        social_feature_factory_contract.events.PlaylistRepostAdded().processReceipt(
            tx_receipt
        )
    )
    for event in new_playlist_repost_events:
        event_args = event["args"]
        repost_user_id = event_args._userId
        repost_playlist_id = event_args._playlistId
        repost_type = RepostType.playlist

        playlist_entries = (
            session.query(Playlist)
            .filter(
                Playlist.is_current == True, Playlist.playlist_id == repost_playlist_id
            )
            .all()
        )

        if playlist_entries and playlist_entries[0].is_album:
            repost_type = RepostType.album

        if (repost_user_id in playlist_repost_state_changes) and (
            repost_playlist_id in playlist_repost_state_changes[repost_user_id]
        ):
            playlist_repost_state_changes[repost_user_id][
                repost_playlist_id
            ].is_delete = False
        else:
            repost = Repost(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=repost_user_id,
                repost_item_id=repost_playlist_id,
                repost_type=repost_type,
                is_current=True,
                is_delete=False,
                created_at=block_datetime,
            )
            if repost_user_id in playlist_repost_state_changes:
                playlist_repost_state_changes[repost_user_id][
                    repost_playlist_id
                ] = repost
            else:
                playlist_repost_state_changes[repost_user_id] = {
                    repost_playlist_id: repost
                }


def delete_playlist_repost(
    self,
    social_feature_factory_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    playlist_repost_state_changes,
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_playlist_repost_events = (
        social_feature_factory_contract.events.PlaylistRepostDeleted().processReceipt(
            tx_receipt
        )
    )
    for event in new_playlist_repost_events:
        event_args = event["args"]
        repost_user_id = event_args._userId
        repost_playlist_id = event_args._playlistId
        repost_type = RepostType.playlist

        playlist_entries = (
            session.query(Playlist)
            .filter(
                Playlist.is_current == True, Playlist.playlist_id == repost_playlist_id
            )
            .all()
        )

        if playlist_entries and playlist_entries[0].is_album:
            repost_type = RepostType.album

        if (repost_user_id in playlist_repost_state_changes) and (
            repost_playlist_id in playlist_repost_state_changes[repost_user_id]
        ):
            playlist_repost_state_changes[repost_user_id][
                repost_playlist_id
            ].is_delete = True
        else:
            repost = Repost(
                blockhash=update_task.web3.toHex(event.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                user_id=repost_user_id,
                repost_item_id=repost_playlist_id,
                repost_type=repost_type,
                is_current=True,
                is_delete=True,
                created_at=block_datetime,
            )
            if repost_user_id in playlist_repost_state_changes:
                playlist_repost_state_changes[repost_user_id][
                    repost_playlist_id
                ] = repost
            else:
                playlist_repost_state_changes[repost_user_id] = {
                    repost_playlist_id: repost
                }


def add_follow(
    self,
    social_feature_factory_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    follow_state_changes,
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_follow_events = (
        social_feature_factory_contract.events.UserFollowAdded().processReceipt(
            tx_receipt
        )
    )

    for entry in new_follow_events:
        event_args = entry["args"]
        follower_user_id = event_args._followerUserId
        followee_user_id = event_args._followeeUserId

        if (follower_user_id in follow_state_changes) and (
            followee_user_id in follow_state_changes[follower_user_id]
        ):
            follow_state_changes[follower_user_id][followee_user_id].is_delete = False
        else:
            follow = Follow(
                blockhash=update_task.web3.toHex(entry.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                follower_user_id=follower_user_id,
                followee_user_id=followee_user_id,
                is_current=True,
                is_delete=False,
                created_at=block_datetime,
            )
            if follower_user_id in follow_state_changes:
                follow_state_changes[follower_user_id][followee_user_id] = follow
            else:
                follow_state_changes[follower_user_id] = {followee_user_id: follow}


def delete_follow(
    self,
    social_feature_factory_contract,
    update_task,
    session,
    tx_receipt,
    block_number,
    block_datetime,
    follow_state_changes,
):
    txhash = update_task.web3.toHex(tx_receipt.transactionHash)
    new_follow_events = (
        social_feature_factory_contract.events.UserFollowDeleted().processReceipt(
            tx_receipt
        )
    )

    for entry in new_follow_events:
        event_args = entry["args"]
        follower_user_id = event_args._followerUserId
        followee_user_id = event_args._followeeUserId

        if (follower_user_id in follow_state_changes) and (
            followee_user_id in follow_state_changes[follower_user_id]
        ):
            follow_state_changes[follower_user_id][followee_user_id].is_delete = True
        else:
            follow = Follow(
                blockhash=update_task.web3.toHex(entry.blockHash),
                blocknumber=block_number,
                txhash=txhash,
                follower_user_id=follower_user_id,
                followee_user_id=followee_user_id,
                is_current=True,
                is_delete=True,
                created_at=block_datetime,
            )
            if follower_user_id in follow_state_changes:
                follow_state_changes[follower_user_id][followee_user_id] = follow
            else:
                follow_state_changes[follower_user_id] = {followee_user_id: follow}
