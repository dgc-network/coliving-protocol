from sqlalchemy import Column, DateTime, Integer, String, func
from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class SPLTokenTransaction(Base, RepresentableMixin):
    __tablename__ = "spl_token_tx"
    last_scanned_slot = Column(Integer, primary_key=True, nullable=False)
    signature = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
