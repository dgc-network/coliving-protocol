"""add-remixes-table

Revision ID: 7b3f27e78b84
Revises: c64edfb319a3
Create Date: 2020-04-29 12:53:06.806762

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "7b3f27e78b84"
down_revision = "c64edfb319a3"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "remixes",
        # A child digital_content "remixes" parent digital_content (and can remixes many)
        sa.Column("parent_digital_content_id", sa.Integer(), nullable=False, index=False),
        sa.Column("child_digital_content_id", sa.Integer(), nullable=False, index=False),
        # TODO: Consider a way to make this possible. It's not right now because
        # there is no unique constraint on agreements.digital_content_id
        # sa.ForeignKeyConstraint(['parent_digital_content_id'], ['agreements.digital_content_id'], ),
        # sa.ForeignKeyConstraint(['child_digital_content_id'], ['agreements.digital_content_id'], ),
        sa.PrimaryKeyConstraint("parent_digital_content_id", "child_digital_content_id"),
    )


def downgrade():
    op.drop_table("remixes")
