"""Add is_deactivated to users

Revision ID: edccccc274a7
Revises: 8bc5bac6711b
Create Date: 2021-11-04 18:31:25.972519

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "edccccc274a7"
down_revision = "8bc5bac6711b"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column(
            "is_deactivated", sa.Boolean(), server_default="false", nullable=False
        ),
    )
    op.create_index(
        op.f("ix_users_is_deactivated"), "users", ["is_deactivated"], unique=False
    )


def downgrade():
    op.drop_index(op.f("ix_users_is_deactivated"), table_name="users")
    op.drop_column("users", "is_deactivated")
