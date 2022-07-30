from src.challenges.create_new_challenges import create_new_challenges
from src.models.rewards.challenge import Challenge
from src.utils.db_session import get_db


def test_create_new_challenges(app):
    with app.app_context():
        db = get_db()
        with db.scoped_session() as session:
            challenges = session.query(Challenge).all()
            if not challenges:
                return

            challenge = challenges[0]
            old_active = challenge.active
            old_amount = challenge.amount
            old_step_count = challenge.step_count
            old_starting_block = challenge.starting_block

            # update challenge and give it different field values than what's in the json
            challenge.active = (
                not challenge.active
            )  # <<< different value than what's in the json
            challenge.amount = (
                challenge.amount + "1"
            )  # <<< different value than what's in the json
            challenge.step_count = (
                challenge.step_count + 1
            )  # <<< different value than what's in the json
            challenge.starting_block = (
                challenge.starting_block + 1 if challenge.starting_block else 1
            )  # <<< different value than what's in the json
            session.add(challenge)

            # make sure challenge is saved in db
            challenges = session.query(Challenge).all()
            saved_challenge = list(filter(lambda c: c.id == challenge.id, challenges))
            assert len(saved_challenge) == 1
            assert saved_challenge[0].active == challenge.active
            assert saved_challenge[0].amount == challenge.amount
            assert saved_challenge[0].step_count == challenge.step_count
            assert saved_challenge[0].starting_block == challenge.starting_block

            # create new challenges / update existing challenges from challenges.json
            create_new_challenges(session)

            # make sure existing challenge is updated to reflect what's in challenges.json
            challenges = session.query(Challenge).all()
            updated_challenge = list(filter(lambda c: c.id == challenge.id, challenges))
            assert updated_challenge
            assert updated_challenge[0].active == old_active
            assert updated_challenge[0].amount == old_amount
            assert updated_challenge[0].step_count == old_step_count
            assert updated_challenge[0].starting_block == old_starting_block
