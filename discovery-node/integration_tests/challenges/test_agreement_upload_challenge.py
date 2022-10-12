from datetime import date, timedelta

import redis
from src.challenges.challenge_event_bus import ChallengeEvent, ChallengeEventBus
from src.challenges.digital_content_upload_challenge import digital_content_upload_challenge_manager
from src.models.indexing.block import Block
from src.models.rewards.challenge import Challenge
from src.models.agreements.digital_content import DigitalContent
from src.models.users.user import User
from src.utils.config import shared_config
from src.utils.db_session import get_db

REDIS_URL = shared_config["redis"]["url"]


def test_digital_content_upload_challenge(app):

    redis_conn = redis.Redis.from_url(url=REDIS_URL)

    # create user
    with app.app_context():
        db = get_db()

    today = date.today()
    block1 = Block(blockhash="0x1", number=1)
    block2 = Block(blockhash="0x2", number=30000000)
    block3 = Block(blockhash="0x3", number=30000001)
    user = User(
        blockhash="0x1",
        blocknumber=1,
        txhash="xyz",
        user_id=1,
        handle="TestHandle",
        handle_lc="testhandle",
        is_current=True,
        created_at=today - timedelta(days=100),
        updated_at=today - timedelta(days=100),
    )
    agreement1 = DigitalContent(
        blockhash="0x1",
        blocknumber=1,
        txhash="xyz",
        owner_id=1,
        digital_content_id=1,
        route_id="1",
        digital_content_segments=[],
        is_unlisted=False,
        is_current=True,
        is_delete=False,
        created_at=today - timedelta(days=100),
        updated_at=today - timedelta(days=100),
    )
    agreement2 = DigitalContent(
        blockhash="0x2",
        blocknumber=30000000,
        txhash="yzx",
        owner_id=1,
        digital_content_id=2,
        route_id="2",
        digital_content_segments=[],
        is_unlisted=False,
        is_current=True,
        is_delete=False,
        created_at=today - timedelta(days=1),
        updated_at=today - timedelta(days=1),
    )
    agreement3 = DigitalContent(
        blockhash="0x3",
        blocknumber=30000001,
        txhash="zxy",
        owner_id=1,
        digital_content_id=3,
        route_id="3",
        digital_content_segments=[],
        is_unlisted=False,
        is_current=True,
        is_delete=False,
        created_at=today,
        updated_at=today,
    )
    agreement4 = DigitalContent(
        blockhash="0x3",
        blocknumber=30000001,
        txhash="abc",
        owner_id=1,
        digital_content_id=4,
        route_id="4",
        digital_content_segments=[],
        is_unlisted=False,
        is_current=True,
        is_delete=False,
        created_at=today,
        updated_at=today,
    )

    unlisted_digital_content = DigitalContent(
        blockhash="0x3",
        blocknumber=30000001,
        txhash="cba",
        owner_id=1,
        digital_content_id=5,
        route_id="5",
        digital_content_segments=[],
        is_unlisted=True,
        is_current=True,
        is_delete=False,
        created_at=today,
        updated_at=today,
    )

    stem = DigitalContent(
        blockhash="0x3",
        blocknumber=30000001,
        txhash="stem",
        owner_id=1,
        digital_content_id=6,
        route_id="6",
        digital_content_segments=[],
        is_unlisted=False,
        is_current=True,
        is_delete=False,
        created_at=today,
        updated_at=today,
        stem_of={"parent_digital_content_id": 4, "category": "bass"},
    )

    with db.scoped_session() as session:
        bus = ChallengeEventBus(redis_conn)

        # Register events with the bus
        bus.register_listener(
            ChallengeEvent.digital_content_upload, digital_content_upload_challenge_manager
        )

        # set challenge as active for purposes of test
        session.query(Challenge).filter(Challenge.id == "digital-content-upload").update(
            {"active": True}
        )

        session.add(block1)
        session.add(block2)
        session.add(block3)
        session.flush()
        session.add(user)
        session.add(agreement1)

        # Process dummy event at block number before this challenge is added
        bus.dispatch(ChallengeEvent.digital_content_upload, 1, 1)
        bus.flush()
        bus.process_events(session)
        user_challenges = digital_content_upload_challenge_manager.get_user_challenge_state(
            session, ["1"]
        )

        # We should not have registered a count for this event
        assert not user_challenges

        # Process dummy event at block number when challenge is added
        session.add(agreement2)
        bus.dispatch(ChallengeEvent.digital_content_upload, 30000000, 1)
        bus.flush()
        bus.process_events(session)
        user_challenge = digital_content_upload_challenge_manager.get_user_challenge_state(
            session, ["1"]
        )[0]

        # We should have completed a single step (one digital_content upload)
        assert user_challenge.current_step_count == 1
        assert not user_challenge.is_complete

        # Ensure unlisted agreements and stems are not counted
        session.add(unlisted_digital_content)
        bus.dispatch(ChallengeEvent.digital_content_upload, 30000001, 1)
        session.add(stem)
        bus.dispatch(ChallengeEvent.digital_content_upload, 30000001, 1)
        bus.flush()
        bus.process_events(session)
        user_challenge = digital_content_upload_challenge_manager.get_user_challenge_state(
            session, ["1"]
        )[0]

        # Ensure stem is not counted

        assert user_challenge.current_step_count == 1

        # Process two more dummy events to reach the step count (i.e. 3) for completion
        session.add(agreement3)
        bus.dispatch(ChallengeEvent.digital_content_upload, 30000001, 1)
        session.add(agreement4)
        bus.dispatch(ChallengeEvent.digital_content_upload, 30000001, 1)
        bus.flush()
        bus.process_events(session)
        user_challenge = digital_content_upload_challenge_manager.get_user_challenge_state(
            session, ["1"]
        )[0]

        # We should have completed the challenge
        assert user_challenge.current_step_count == 3
        assert user_challenge.is_complete

        # ensure that if we lose some data now that the thing is complete, we don't change the status of the challenge
        session.query(DigitalContent).filter(DigitalContent.owner_id == user.user_id).update(
            {"is_delete": True}
        )
        session.flush()
        bus.dispatch(ChallengeEvent.digital_content_upload, 3, 1)
        bus.flush()
        bus.process_events(session)
        user_challenge = digital_content_upload_challenge_manager.get_user_challenge_state(
            session, ["1"]
        )[0]

        # The challenge should still be completed
        assert user_challenge.current_step_count == 3
        assert user_challenge.is_complete
