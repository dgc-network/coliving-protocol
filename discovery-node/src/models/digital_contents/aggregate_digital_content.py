from sqlalchemy import Column, Integer, text
from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class AggregateDigitalContent(Base, RepresentableMixin):
    __tablename__ = "aggregate_digital_content"

    digital_content_id = Column(Integer, primary_key=True)
    repost_count = Column(Integer, nullable=False, server_default=text("0"))
    save_count = Column(Integer, nullable=False, server_default=text("0"))
