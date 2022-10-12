from sqlalchemy import Column, DateTime, Float, Integer, String
from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class DigitalContentTrendingScore(Base, RepresentableMixin):
    """
    Trending Scores for digitalContents
    """

    __tablename__ = "digital_content_trending_scores"

    digital_content_id = Column(Integer, primary_key=True, nullable=False, index=True)
    type = Column(String, primary_key=True, nullable=False, index=True)
    genre = Column(String, index=True)
    version = Column(String, primary_key=True, nullable=False)
    time_range = Column(String, primary_key=True, nullable=False)
    score = Column(Float(53), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False)
