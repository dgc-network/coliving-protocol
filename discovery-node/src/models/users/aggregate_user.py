from sqlalchemy import BigInteger, Column, Integer, text
from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class AggregateUser(Base, RepresentableMixin):
    __tablename__ = "aggregate_user"

    user_id = Column(Integer, primary_key=True)
    digital_content_count = Column(BigInteger, server_default=text("0"))
    content_list_count = Column(BigInteger, server_default=text("0"))
    album_count = Column(BigInteger, server_default=text("0"))
    follower_count = Column(BigInteger, server_default=text("0"))
    following_count = Column(BigInteger, server_default=text("0"))
    repost_count = Column(BigInteger, server_default=text("0"))
    digital_content_save_count = Column(BigInteger, server_default=text("0"))
    supporter_count = Column(Integer, nullable=False, server_default=text("0"))
    supporting_count = Column(Integer, nullable=False, server_default=text("0"))
