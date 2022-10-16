import enum

from sqlalchemy import Column, DateTime, Index, Integer, String
from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class MilestoneName(str, enum.Enum):
    LISTEN_COUNT = "LISTEN_COUNT"
    FOLLOWER_COUNT = "FOLLOWER_COUNT"
    DIGITAL_CONTENT_SAVE_COUNT = "DIGITAL_CONTENT_SAVE_COUNT"
    CONTENT_LIST_SAVE_COUNT = "CONTENT_LIST_SAVE_COUNT"
    DIGITAL_CONTENT_REPOST_COUNT = "DIGITAL_CONTENT_REPOST_COUNT"
    CONTENT_LIST_REPOST_COUNT = "CONTENT_LIST_REPOST_COUNT"


class Milestone(Base, RepresentableMixin):
    __tablename__ = "milestones"
    __table_args__ = (Index("milestones_name_idx", "name", "id"),)

    id = Column(Integer, primary_key=True, nullable=False)
    name = Column(String, primary_key=True, nullable=False)
    threshold = Column(Integer, primary_key=True, nullable=False)
    blocknumber = Column(Integer)
    slot = Column(Integer)
    timestamp = Column(DateTime, nullable=False)
