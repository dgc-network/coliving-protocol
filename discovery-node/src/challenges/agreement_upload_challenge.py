from collections import Counter
from typing import List, Optional

from sqlalchemy.orm.session import Session
from src.challenges.challenge import (
    ChallengeManager,
    ChallengeUpdater,
    FullEventMetadata,
)
from src.models.rewards.user_challenge import UserChallenge
from src.models.agreements.digital_content import DigitalContent


class AgreementUploadChallengeUpdater(ChallengeUpdater):
    """Updates a digital_content upload challenge.
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
                "Expected a step count and starting block for digital_content upload challenge"
            )

        num_digital_contents_per_user = self._get_num_digital_content_uploads_by_user(
            session,
            user_challenges,
            starting_block,
        )

        # Update the user_challenges
        for user_challenge in user_challenges:
            # Update step count
            user_challenge.current_step_count = num_digital_contents_per_user[
                user_challenge.user_id
            ]
            # Update completion
            user_challenge.is_complete = (
                user_challenge.current_step_count is not None
                and user_challenge.current_step_count >= step_count
            )

    def _get_num_digital_content_uploads_by_user(
        self, session: Session, user_challenges: List[UserChallenge], block_number: int
    ):
        user_ids = [user_challenge.user_id for user_challenge in user_challenges]
        agreements = (
            session.query(DigitalContent)
            .filter(
                DigitalContent.owner_id.in_(user_ids),
                DigitalContent.blocknumber >= block_number,
                DigitalContent.is_current == True,
                DigitalContent.is_delete == False,
                DigitalContent.is_unlisted == False,
                DigitalContent.stem_of == None,
            )
            .all()
        )
        num_digital_contents_per_user = Counter(map(lambda t: t.owner_id, agreements))
        return num_digital_contents_per_user


digital_content_upload_challenge_manager = ChallengeManager(
    "digital-content-upload", AgreementUploadChallengeUpdater()
)
