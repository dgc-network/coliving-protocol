from sqlalchemy import BigInteger, Column, String, Table
from src.models.base import Base

# Materialized view
t_app_name_metrics_trailing_month = Table(
    "app_name_metrics_trailing_month",
    Base.metadata,
    Column("name", String),
    Column("count", BigInteger),
)
