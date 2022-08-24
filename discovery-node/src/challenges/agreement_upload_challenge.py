from collections import Counter
from typing import List, Optional

from sqlalchemy.orm.session import Session
from src.challenges.challenge import (
    ChallengeManager,
    ChallengeUpdater,
    FullEventMetadata,
)
from src.models.rewards.user_challenge import UserChallenge
from src.models.agreements.agreement import Agreement


class AgreementUploadChallengeUpdater(ChallengeUpdater):
    """Updates a agreement upload challenge.
    Requires user to upload N (e.g. 3) songs to Coliving to complete the challenge.
    """

    def update_user_challenges(
        self,
        session: Session,
        event: str,
        user_challenges: List[UserChallenge],
        step_count: Optional[int],
        event_metadatas: List[FullEventMetadata],
        starting_block: Optional[int],
    ):
        if step_count is None or starting_block is None:
            raise Exception(
                "Expected a step count and starting block for agreement upload challenge"
            )

        num_agreements_per_user = self._get_num_agreement_uploads_by_user(
            session,
            user_challenges,
            starting_block,
        )

        # Update the user_challenges
        for user_challenge in user_challenges:
            # Update step count
            user_challenge.current_step_count = num_agreements_per_user[
                user_challenge.user_id
            ]
            # Update completion
            user_challenge.is_complete = (
                user_challenge.current_step_count is not None
                and user_challenge.current_step_count >= step_count
            )

    def _get_num_agreement_uploads_by_user(
        self, session: Session, user_challenges: List[UserChallenge], block_number: int
    ):
        user_ids = [user_challenge.user_id for user_challenge in user_challenges]
        agreements = (
            session.query(Agreement)
            .filter(
                Agreement.owner_id.in_(user_ids),
                Agreement.blocknumber >= block_number,
                Agreement.is_current == True,
                Agreement.is_delete == False,
                Agreement.is_unlisted == False,
                Agreement.stem_of == None,
            )
            .all()
        )
        num_agreements_per_user = Counter(map(lambda t: t.owner_id, agreements))
        return num_agreements_per_user


agreement_upload_challenge_manager = ChallengeManager(
    "agreement-upload", AgreementUploadChallengeUpdater()
)
