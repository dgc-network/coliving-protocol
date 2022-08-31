from datetime import date, timedelta

import redis
from src.challenges.challenge_event_bus import ChallengeEvent, ChallengeEventBus
from src.challenges.agreement_upload_challenge import agreement_upload_challenge_manager
from src.models.indexing.block import Block
from src.models.rewards.challenge import Challenge
from src.models.agreements.agreement import Agreement
from src.models.users.user import User
from src.utils.config import shared_config
from src.utils.db_session import get_db

REDIS_URL = shared_config["redis"]["url"]


def test_agreement_upload_challenge(app):

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
    agreement1 = Agreement(
        blockhash="0x1",
        blocknumber=1,
        txhash="xyz",
        owner_id=1,
        agreement_id=1,
        route_id="1",
        agreement_segments=[],
        is_unlisted=False,
        is_current=True,
        is_delete=False,
        created_at=today - timedelta(days=100),
        updated_at=today - timedelta(days=100),
    )
    agreement2 = Agreement(
        blockhash="0x2",
        blocknumber=30000000,
        txhash="yzx",
        owner_id=1,
        agreement_id=2,
        route_id="2",
        agreement_segments=[],
        is_unlisted=False,
        is_current=True,
        is_delete=False,
        created_at=today - timedelta(days=1),
        updated_at=today - timedelta(days=1),
    )
    agreement3 = Agreement(
        blockhash="0x3",
        blocknumber=30000001,
        txhash="zxy",
        owner_id=1,
        agreement_id=3,
        route_id="3",
        agreement_segments=[],
        is_unlisted=False,
        is_current=True,
        is_delete=False,
        created_at=today,
        updated_at=today,
    )
    agreement4 = Agreement(
        blockhash="0x3",
        blocknumber=30000001,
        txhash="abc",
        owner_id=1,
        agreement_id=4,
        route_id="4",
        agreement_segments=[],
        is_unlisted=False,
        is_current=True,
        is_delete=False,
        created_at=today,
        updated_at=today,
    )

    unlisted_agreement = Agreement(
        blockhash="0x3",
        blocknumber=30000001,
        txhash="cba",
        owner_id=1,
        agreement_id=5,
        route_id="5",
        agreement_segments=[],
        is_unlisted=True,
        is_current=True,
        is_delete=False,
        created_at=today,
        updated_at=today,
    )

    stem = Agreement(
        blockhash="0x3",
        blocknumber=30000001,
        txhash="stem",
        owner_id=1,
        agreement_id=6,
        route_id="6",
        agreement_segments=[],
        is_unlisted=False,
        is_current=True,
        is_delete=False,
        created_at=today,
        updated_at=today,
        stem_of={"parent_agreement_id": 4, "category": "bass"},
    )

    with db.scoped_session() as session:
        bus = ChallengeEventBus(redis_conn)

        # Register events with the bus
        bus.register_listener(
            ChallengeEvent.agreement_upload, agreement_upload_challenge_manager
        )

        # set challenge as active for purposes of test
        session.query(Challenge).filter(Challenge.id == "agreement-upload").update(
            {"active": True}
        )

        session.add(block1)
        session.add(block2)
        session.add(block3)
        session.flush()
        session.add(user)
        session.add(agreement1)

        # Process dummy event at block number before this challenge is added
        bus.dispatch(ChallengeEvent.agreement_upload, 1, 1)
        bus.flush()
        bus.process_events(session)
        user_challenges = agreement_upload_challenge_manager.get_user_challenge_state(
            session, ["1"]
        )

        # We should not have registered a count for this event
        assert not user_challenges

        # Process dummy event at block number when challenge is added
        session.add(agreement2)
        bus.dispatch(ChallengeEvent.agreement_upload, 30000000, 1)
        bus.flush()
        bus.process_events(session)
        user_challenge = agreement_upload_challenge_manager.get_user_challenge_state(
            session, ["1"]
        )[0]

        # We should have completed a single step (one agreement upload)
        assert user_challenge.current_step_count == 1
        assert not user_challenge.is_complete

        # Ensure unlisted agreements and stems are not counted
        session.add(unlisted_agreement)
        bus.dispatch(ChallengeEvent.agreement_upload, 30000001, 1)
        session.add(stem)
        bus.dispatch(ChallengeEvent.agreement_upload, 30000001, 1)
        bus.flush()
        bus.process_events(session)
        user_challenge = agreement_upload_challenge_manager.get_user_challenge_state(
            session, ["1"]
        )[0]

        # Ensure stem is not counted

        assert user_challenge.current_step_count == 1

        # Process two more dummy events to reach the step count (i.e. 3) for completion
        session.add(agreement3)
        bus.dispatch(ChallengeEvent.agreement_upload, 30000001, 1)
        session.add(agreement4)
        bus.dispatch(ChallengeEvent.agreement_upload, 30000001, 1)
        bus.flush()
        bus.process_events(session)
        user_challenge = agreement_upload_challenge_manager.get_user_challenge_state(
            session, ["1"]
        )[0]

        # We should have completed the challenge
        assert user_challenge.current_step_count == 3
        assert user_challenge.is_complete

        # ensure that if we lose some data now that the thing is complete, we don't change the status of the challenge
        session.query(Agreement).filter(Agreement.owner_id == user.user_id).update(
            {"is_delete": True}
        )
        session.flush()
        bus.dispatch(ChallengeEvent.agreement_upload, 3, 1)
        bus.flush()
        bus.process_events(session)
        user_challenge = agreement_upload_challenge_manager.get_user_challenge_state(
            session, ["1"]
        )[0]

        # The challenge should still be completed
        assert user_challenge.current_step_count == 3
        assert user_challenge.is_complete
