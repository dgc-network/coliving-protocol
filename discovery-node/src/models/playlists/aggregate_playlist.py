from sqlalchemy import Boolean, Column, Integer, text
from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class AggregateContentList(Base, RepresentableMixin):
    __tablename__ = "aggregate_content list"

    content list_id = Column(Integer, primary_key=True)
    is_album = Column(Boolean)
    repost_count = Column(Integer, server_default=text("0"))
    save_count = Column(Integer, server_default=text("0"))
