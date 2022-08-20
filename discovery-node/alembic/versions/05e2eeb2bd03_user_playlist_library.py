"""user_content list_library

Revision ID: 05e2eeb2bd03
Revises: 6cf96b71cf3d
Create Date: 2021-05-18 19:12:33.451567

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "05e2eeb2bd03"
down_revision = "6cf96b71cf3d"
branch_labels = None
depends_on = None


def upgrade():
    # Add the user content list library column as JSONB, which stores the folder structure
    # for a user's favorite content lists
    op.add_column(
        "users", sa.Column("content list_library", postgresql.JSONB(), nullable=True)
    )


def downgrade():
    op.drop_column("users", "content list_library")
