from sqlalchemy import Column, Integer, String
from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class ChallengeDisbursement(Base, RepresentableMixin):
    __tablename__ = "challenge_disbursements"

    challenge_id = Column(String, primary_key=True, nullable=False)
    user_id = Column(Integer, nullable=False)
    specifier = Column(String, primary_key=True, nullable=False)
    signature = Column(String, nullable=False)
    slot = Column(Integer, nullable=False, index=True)
    amount = Column(String, nullable=False)
