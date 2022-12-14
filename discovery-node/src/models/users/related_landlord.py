from sqlalchemy import Column, DateTime, Float, Integer, text
from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class RelatedLandlord(Base, RepresentableMixin):
    __tablename__ = "related_landlords"

    user_id = Column(Integer, primary_key=True, nullable=False, index=True)
    related_landlord_user_id = Column(Integer, primary_key=True, nullable=False)
    score = Column(Float(53), nullable=False)
    created_at = Column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
