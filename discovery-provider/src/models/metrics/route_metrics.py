from sqlalchemy import Column, DateTime, Integer, String, text
from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class RouteMetric(Base, RepresentableMixin):
    __tablename__ = "route_metrics"

    route_path = Column(String, nullable=False)
    version = Column(String, nullable=False)
    query_string = Column(String, nullable=False, server_default="")
    count = Column(Integer, nullable=False)
    timestamp = Column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    created_at = Column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at = Column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    id = Column(Integer, primary_key=True)
    ip = Column(String)
