from sqlalchemy import Column, Index, Integer, Table, Text
from src.models.base import Base

# Materialized view
t_tag_digital_content_user = Table(
    "tag_digital_content_user",
    Base.metadata,
    Column("tag", Text, index=True),
    Column("digital_content_id", Integer),
    Column("owner_id", Integer),
    Index("tag_digital_content_user_idx", "tag", "digital_content_id", "owner_id", unique=True),
)
