from sqlalchemy import Column, Index, Integer, Table, Text
from src.models.base import Base

# Materialized view
t_tag_agreement_user = Table(
    "tag_agreement_user",
    Base.metadata,
    Column("tag", Text, index=True),
    Column("agreement_id", Integer),
    Column("owner_id", Integer),
    Index("tag_agreement_user_idx", "tag", "agreement_id", "owner_id", unique=True),
)
