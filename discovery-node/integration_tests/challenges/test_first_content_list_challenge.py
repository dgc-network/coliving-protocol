import logging
from datetime import datetime

import redis
from src.challenges.challenge_event_bus import ChallengeEvent, ChallengeEventBus
from src.challenges.first_content_list_challenge import first_content_list_challenge_manager
from src.models.indexing.block import Block
from src.models.rewards.challenge import Challenge
from src.models.users.user import User
from src.utils.config import shared_config
from src.utils.db_session import get_db

REDIS_URL = shared_config["redis"]["url"]
BLOCK_NUMBER = 10
logger = logging.getLogger(__name__)


def test_first_content_list_challenge(app):
    redis_conn = redis.Redis.from_url(url=REDIS_URL)

    with app.app_context():
        db = get_db()

    block = Block(blockhash="0x1", number=BLOCK_NUMBER)
    user = User(
        blockhash="0x1",
        blocknumber=BLOCK_NUMBER,
        txhash="xyz",
        user_id=1,
        is_current=True,
        handle="TestHandle",
        handle_lc="testhandle",
        wallet="0x1",
        is_verified=False,
        name="test_name",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    with db.scoped_session() as session:
        bus = ChallengeEventBus(redis_conn)
        session.query(Challenge).filter(Challenge.id == "first-content-list").update(
            {"active": True, "starting_block": BLOCK_NUMBER}
        )

        # Register events with the bus
        bus.register_listener(
            ChallengeEvent.first_content_list, first_content_list_challenge_manager
        )

        session.add(block)
        session.flush()
        session.add(user)
        session.flush()

        bus.dispatch(
            ChallengeEvent.first_content_list,
            BLOCK_NUMBER,
            user.user_id,
            {},
        )

        bus.flush()
        bus.process_events(session)
        session.flush()

        state = first_content_list_challenge_manager.get_user_challenge_state(
            session, ["1"]
        )[0]

        assert state.is_complete
