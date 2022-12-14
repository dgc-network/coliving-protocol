from sqlalchemy import Column, Integer
from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class Stem(Base, RepresentableMixin):
    __tablename__ = "stems"

    parent_digital_content_id = Column(Integer, primary_key=True, nullable=False)
    child_digital_content_id = Column(Integer, primary_key=True, nullable=False)
