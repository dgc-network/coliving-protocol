from datetime import datetime

from src.models.indexing.block import Block
from src.models.indexing.indexing_checkpoints import IndexingCheckpoint
from src.models.indexing.ursm_content_node import UrsmContentNode
from src.models.contentLists.contentList import ContentList
from src.models.rewards.challenge import Challenge
from src.models.rewards.user_challenge import UserChallenge
from src.models.social.aggregate_monthly_plays import AggregateMonthlyPlay
from src.models.social.aggregate_plays import AggregatePlay
from src.models.social.follow import Follow
from src.models.social.hourly_play_counts import HourlyPlayCount
from src.models.social.play import Play
from src.models.social.repost import Repost
from src.models.social.save import Save
from src.models.agreements.aggregate_agreement import AggregateAgreement
from src.models.agreements.remix import Remix
from src.models.agreements.stem import Stem
from src.models.agreements.agreement import Agreement
from src.models.agreements.agreement_route import AgreementRoute
from src.models.users.aggregate_user import AggregateUser
from src.models.users.associated_wallet import AssociatedWallet, WalletChain
from src.models.users.user import User
from src.models.users.user_bank import UserBankAccount
from src.models.users.user_listening_history import UserListeningHistory
from src.tasks.aggregates import get_latest_blocknumber
from src.utils import helpers
from src.utils.db_session import get_db


def query_creator_by_name(app, creator_name=None):
    """Return list of creators filtered by name (if present)"""
    query_results = None
    with app.app_context():
        db = get_db()

        with db.scoped_session() as session:
            if creator_name is not None:
                query_results = (
                    session.query(User)
                    .filter(User.name == creator_name)
                    .order_by(User.user_id)
                    .all()
                )
            else:
                query_results = session.query(User).order_by(User.user_id).all()

            assert query_results is not None
            return_list = helpers.query_result_to_list(query_results)
            return return_list


def toBytes(val, length=32):
    val = val[:length]
    return bytes(val, "utf-8")


def populate_mock_db_blocks(db, min, max):
    """
    Helper function to populate the mock DB with blocks

    Args:
        db - sqlalchemy db session
        min - min block number
        max - max block number
    """
    with db.scoped_session() as session:
        for i in range(min, max):
            block = Block(
                blockhash=hex(i),
                number=i,
                parenthash="0x01",
                is_current=(i == 0),
            )
            session.add(block)
            session.flush()


def populate_mock_db(db, entities, block_offset=None):
    """
    Helper function to populate the mock DB with agreements, users, plays, and follows

    Args:
        db - sqlalchemy db session
        entities - dict of keys agreements, users, plays of arrays of metadata
    """
    with db.scoped_session() as session:
        # check if blocknumber already exists for longer running tests
        if block_offset is None:
            block_offset = get_latest_blocknumber(session)
            if block_offset:
                block_offset += 1
            else:
                block_offset = 0

        agreements = entities.get("agreements", [])
        contentLists = entities.get("contentLists", [])
        users = entities.get("users", [])
        follows = entities.get("follows", [])
        reposts = entities.get("reposts", [])
        saves = entities.get("saves", [])
        agreement_routes = entities.get("agreement_routes", [])
        remixes = entities.get("remixes", [])
        stems = entities.get("stems", [])
        challenges = entities.get("challenges", [])
        user_challenges = entities.get("user_challenges", [])
        plays = entities.get("plays", [])
        aggregate_plays = entities.get("aggregate_plays", [])
        aggregate_agreement = entities.get("aggregate_agreement", [])
        aggregate_monthly_plays = entities.get("aggregate_monthly_plays", [])
        aggregate_user = entities.get("aggregate_user", [])
        indexing_checkpoints = entities.get("indexing_checkpoints", [])
        user_listening_history = entities.get("user_listening_history", [])
        hourly_play_counts = entities.get("hourly_play_counts", [])
        user_bank_accounts = entities.get("user_bank_accounts", [])
        associated_wallets = entities.get("associated_wallets", [])
        ursm_content_nodes = entities.get("ursm_content_nodes", [])

        num_blocks = max(
            len(agreements), len(users), len(follows), len(saves), len(reposts)
        )
        for i in range(block_offset, block_offset + num_blocks):
            max_block = session.query(Block).filter(Block.number == i).first()
            session.query(Block).filter(Block.is_current == True).update(
                {"is_current": False}
            )
            if not max_block:
                block = Block(
                    blockhash=hex(i),
                    number=i,
                    parenthash="0x01",
                    is_current=(i == block_offset + num_blocks - 1),
                )
                session.add(block)
                session.flush()

        for i, agreement_meta in enumerate(agreements):
            agreement_id = agreement_meta.get("agreement_id", i)

            # mark previous agreements as is_current = False
            session.query(Agreement).filter(Agreement.is_current == True).filter(
                Agreement.agreement_id == agreement_id
            ).update({"is_current": False})

            agreement = Agreement(
                blockhash=hex(i + block_offset),
                blocknumber=i + block_offset,
                txhash=agreement_meta.get("txhash", str(i + block_offset)),
                agreement_id=agreement_id,
                title=agreement_meta.get("title", f"agreement_{i}"),
                is_current=agreement_meta.get("is_current", True),
                is_delete=agreement_meta.get("is_delete", False),
                owner_id=agreement_meta.get("owner_id", 1),
                route_id=agreement_meta.get("route_id", ""),
                agreement_segments=agreement_meta.get("agreement_segments", []),
                tags=agreement_meta.get("tags", None),
                genre=agreement_meta.get("genre", ""),
                updated_at=agreement_meta.get("updated_at", datetime.now()),
                created_at=agreement_meta.get("created_at", datetime.now()),
                release_date=agreement_meta.get("release_date", None),
                is_unlisted=agreement_meta.get("is_unlisted", False),
            )
            session.add(agreement)
        for i, contentList_meta in enumerate(contentLists):
            contentList = ContentList(
                blockhash=hex(i + block_offset),
                blocknumber=i + block_offset,
                txhash=contentList_meta.get("txhash", str(i + block_offset)),
                contentList_id=contentList_meta.get("contentList_id", i),
                is_current=contentList_meta.get("is_current", True),
                is_delete=contentList_meta.get("is_delete", False),
                contentList_owner_id=contentList_meta.get("contentList_owner_id", 1),
                is_album=contentList_meta.get("is_album", False),
                is_private=contentList_meta.get("is_private", False),
                contentList_name=contentList_meta.get("contentList_name", f"contentList_{i}"),
                contentList_contents=contentList_meta.get(
                    "contentList_contents", {"agreement_ids": []}
                ),
                contentList_image_multihash=contentList_meta.get(
                    "contentList_image_multihash", ""
                ),
                contentList_image_sizes_multihash=contentList_meta.get(
                    "contentList_image_sizes_multihash", ""
                ),
                description=contentList_meta.get("description", f"description_{i}"),
                upc=contentList_meta.get("upc", f"upc_{i}"),
                updated_at=contentList_meta.get("updated_at", datetime.now()),
                created_at=contentList_meta.get("created_at", datetime.now()),
            )
            session.add(contentList)

        for i, user_meta in enumerate(users):
            user = User(
                blockhash=hex(i + block_offset),
                blocknumber=i + block_offset,
                txhash=user_meta.get("txhash", str(i + block_offset)),
                user_id=user_meta.get("user_id", i),
                is_current=user_meta.get("is_current", True),
                handle=user_meta.get("handle", str(i)),
                handle_lc=user_meta.get("handle", str(i)).lower(),
                wallet=user_meta.get("wallet", str(i)),
                bio=user_meta.get("bio", str(i)),
                profile_picture=user_meta.get("profile_picture"),
                profile_picture_sizes=user_meta.get("profile_picture_sizes"),
                cover_photo=user_meta.get("cover_photo"),
                cover_photo_sizes=user_meta.get("cover_photo_sizes"),
                updated_at=user_meta.get("updated_at", datetime.now()),
                created_at=user_meta.get("created_at", datetime.now()),
                primary_id=user_meta.get("primary_id"),
                secondary_ids=user_meta.get("secondary_ids"),
                replica_set_update_signer=user_meta.get("replica_set_update_signer"),
            )
            user_bank = UserBankAccount(
                signature=f"0x{i}",
                ethereum_address=user_meta.get("wallet", str(i)),
                bank_account=f"0x{i}",
                created_at=datetime.now(),
            )
            session.add(user)
            session.add(user_bank)

        for i, follow_meta in enumerate(follows):
            follow = Follow(
                blockhash=hex(i + block_offset),
                blocknumber=follow_meta.get("blocknumber", i + block_offset),
                follower_user_id=follow_meta.get("follower_user_id", i + 1),
                followee_user_id=follow_meta.get("followee_user_id", i),
                is_current=follow_meta.get("is_current", True),
                is_delete=follow_meta.get("is_delete", False),
                created_at=follow_meta.get("created_at", datetime.now()),
            )
            session.add(follow)
        for i, repost_meta in enumerate(reposts):
            repost = Repost(
                blockhash=hex(i + block_offset),
                blocknumber=repost_meta.get("blocknumber", i + block_offset),
                txhash=repost_meta.get("txhash", str(i + block_offset)),
                user_id=repost_meta.get("user_id", i + 1),
                repost_item_id=repost_meta.get("repost_item_id", i),
                repost_type=repost_meta.get("repost_type", "agreement"),
                is_current=repost_meta.get("is_current", True),
                is_delete=repost_meta.get("is_delete", False),
                created_at=repost_meta.get("created_at", datetime.now()),
            )
            session.add(repost)
        for i, save_meta in enumerate(saves):
            save = Save(
                blockhash=hex(i + block_offset),
                blocknumber=save_meta.get("blocknumber", i + block_offset),
                txhash=save_meta.get("txhash", str(i + block_offset)),
                user_id=save_meta.get("user_id", i + 1),
                save_item_id=save_meta.get("save_item_id", i),
                save_type=save_meta.get("save_type", "agreement"),
                is_current=save_meta.get("is_current", True),
                is_delete=save_meta.get("is_delete", False),
                created_at=save_meta.get("created_at", datetime.now()),
            )
            session.add(save)

        for i, play_meta in enumerate(plays):
            play = Play(
                id=play_meta.get("id", i + 1),
                user_id=play_meta.get("user_id", i + 1),
                source=play_meta.get("source", None),
                play_item_id=play_meta.get("item_id", i + 1),
                slot=play_meta.get("slot", i + 1),
                signature=play_meta.get("signature", None),
                created_at=play_meta.get("created_at", datetime.now()),
                updated_at=play_meta.get("updated_at", datetime.now()),
            )
            session.add(play)

        for i, aggregate_play_meta in enumerate(aggregate_plays):
            aggregate_play = AggregatePlay(
                play_item_id=aggregate_play_meta.get("play_item_id", i),
                count=aggregate_play_meta.get("count", 0),
            )
            session.add(aggregate_play)

        for i, aggregate_agreement_meta in enumerate(aggregate_agreement):
            aggregate_agreement = AggregateAgreement(
                agreement_id=aggregate_agreement_meta.get("agreement_id", i),
                repost_count=aggregate_agreement_meta.get("repost_count", 0),
                save_count=aggregate_agreement_meta.get("save_count", 0),
            )
            session.add(aggregate_agreement)

        for i, aggregate_monthly_play_meta in enumerate(aggregate_monthly_plays):
            aggregate_monthly_play = AggregateMonthlyPlay(
                play_item_id=aggregate_monthly_play_meta.get("play_item_id", i),
                timestamp=aggregate_monthly_play_meta.get("timestamp", i),
                count=aggregate_monthly_play_meta.get("count", 0),
            )
            session.add(aggregate_monthly_play)

        for i, aggregate_user_meta in enumerate(aggregate_user):
            user = AggregateUser(
                user_id=aggregate_user_meta.get("user_id", i),
                agreement_count=aggregate_user_meta.get("agreement_count", 0),
                contentList_count=aggregate_user_meta.get("contentList_count", 0),
                album_count=aggregate_user_meta.get("album_count", 0),
                follower_count=aggregate_user_meta.get("follower_count", 0),
                following_count=aggregate_user_meta.get("following_count", 0),
                repost_count=aggregate_user_meta.get("repost_count", 0),
                agreement_save_count=aggregate_user_meta.get("agreement_save_count", 0),
            )
            session.add(user)

        for i, user_listening_history_meta in enumerate(user_listening_history):
            user_listening_history = UserListeningHistory(
                user_id=user_listening_history_meta.get("user_id", i + 1),
                listening_history=user_listening_history_meta.get(
                    "listening_history", None
                ),
            )
            session.add(user_listening_history)

        for i, hourly_play_count_meta in enumerate(hourly_play_counts):
            hourly_play_count = HourlyPlayCount(
                hourly_timestamp=hourly_play_count_meta.get(
                    "hourly_timestamp", datetime.now()
                ),
                play_count=hourly_play_count_meta.get("play_count", 0),
            )
            session.add(hourly_play_count)

        if indexing_checkpoints:
            session.execute(
                "TRUNCATE TABLE indexing_checkpoints"
            )  # clear primary keys before adding
            for i, indexing_checkpoint_meta in enumerate(indexing_checkpoints):
                indexing_checkpoint = IndexingCheckpoint(
                    tablename=indexing_checkpoint_meta.get("tablename", None),
                    last_checkpoint=indexing_checkpoint_meta.get("last_checkpoint", 0),
                )
                session.add(indexing_checkpoint)

        for i, route_meta in enumerate(agreement_routes):
            route = AgreementRoute(
                slug=route_meta.get("slug", ""),
                title_slug=route_meta.get("title_slug", ""),
                blockhash=hex(i + block_offset),
                blocknumber=route_meta.get("blocknumber", i + block_offset),
                owner_id=route_meta.get("owner_id", i + 1),
                agreement_id=route_meta.get("agreement_id", i + 1),
                is_current=route_meta.get("is_current", True),
                txhash=route_meta.get("txhash", str(i + 1)),
                collision_id=route_meta.get("collision_id", 0),
            )
            session.add(route)

        for i, remix_meta in enumerate(remixes):
            remix = Remix(
                parent_agreement_id=remix_meta.get("parent_agreement_id", i),
                child_agreement_id=remix_meta.get("child_agreement_id", i + 1),
            )
            session.add(remix)
        for i, stems_meta in enumerate(stems):
            stem = Stem(
                parent_agreement_id=stems_meta.get("parent_agreement_id", i),
                child_agreement_id=stems_meta.get("child_agreement_id", i + 1),
            )
            session.add(stem)

        for i, challenge_meta in enumerate(challenges):
            challenge = Challenge(
                id=challenge_meta.get("id", ""),
                type=challenge_meta.get("type", ""),
                amount=challenge_meta.get("amount", ""),
                active=challenge_meta.get("active", True),
                step_count=challenge_meta.get("step_count", None),
                starting_block=challenge_meta.get("starting_block", None),
            )
            session.add(challenge)
        for i, user_challenge_meta in enumerate(user_challenges):
            user_challenge = UserChallenge(
                challenge_id=user_challenge_meta.get("challenge_id", ""),
                user_id=user_challenge_meta.get("user_id", 1),
                specifier=user_challenge_meta.get("specifier", ""),
                is_complete=user_challenge_meta.get("is_complete", False),
                completed_blocknumber=user_challenge_meta.get(
                    "completed_blocknumber", 1 + block_offset
                ),
                current_step_count=user_challenge_meta.get("current_step_count", None),
            )
            session.add(user_challenge)
        for i, user_bank_account in enumerate(user_bank_accounts):
            bank = UserBankAccount(
                signature=user_bank_account.get("signature", ""),
                ethereum_address=user_bank_account.get("ethereum_address", ""),
                bank_account=user_bank_account.get("bank_account", ""),
                created_at=user_bank_account.get("created_at", datetime.now()),
            )
            session.add(bank)
        for i, associated_wallet in enumerate(associated_wallets):
            wallet = AssociatedWallet(
                blockhash=associated_wallet.get("blockhash", hex(i + block_offset)),
                blocknumber=associated_wallet.get("blocknumber", i + block_offset),
                is_current=associated_wallet.get("is_current", True),
                is_delete=associated_wallet.get("is_delete", False),
                user_id=associated_wallet.get("user_id", 1),
                wallet=associated_wallet.get("wallet", str(i)),
                chain=associated_wallet.get("chain", WalletChain.sol),
            )
            session.add(wallet)
        for i, ursm_content_node in enumerate(ursm_content_nodes):
            node = UrsmContentNode(
                blockhash=ursm_content_node.get("blockhash", hex(i + block_offset)),
                blocknumber=ursm_content_node.get("blocknumber", i + block_offset),
                slot=ursm_content_node.get("slot", i + 1),
                txhash=ursm_content_node.get("txhash", str(i + block_offset)),
                is_current=ursm_content_node.get("is_current", True),
                cnode_sp_id=ursm_content_node.get("cnode_sp_id", i + 1),
                delegate_owner_wallet=ursm_content_node.get(
                    "delegate_owner_wallet",
                    "delegate_owner_wallet_" + str(i + block_offset),
                ),
                owner_wallet=ursm_content_node.get(
                    "owner_wallet", "owner_wallet" + str(i + block_offset)
                ),
                proposer_sp_ids=ursm_content_node.get("proposer_sp_ids", [0, 0, 0]),
                proposer_1_delegate_owner_wallet=ursm_content_node.get(
                    "proposer_1_delegate_owner_wallet",
                    "proposer_1_delegate_owner_wallet_" + str(i + block_offset),
                ),
                proposer_2_delegate_owner_wallet=ursm_content_node.get(
                    "proposer_2_delegate_owner_wallet",
                    "proposer_2_delegate_owner_wallet_" + str(i + block_offset),
                ),
                proposer_3_delegate_owner_wallet=ursm_content_node.get(
                    "proposer_3_delegate_owner_wallet",
                    "proposer_3_delegate_owner_wallet_" + str(i + block_offset),
                ),
                endpoint=ursm_content_node.get("endpoint", f"www.content_node{i}.com"),
                created_at=ursm_content_node.get("created_at", datetime.now()),
            )
            session.add(node)

        session.flush()
