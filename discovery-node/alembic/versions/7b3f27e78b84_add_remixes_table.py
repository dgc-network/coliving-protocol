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
        # A child agreement "remixes" parent agreement (and can remixes many)
        sa.Column("parent_agreement_id", sa.Integer(), nullable=False, index=False),
        sa.Column("child_agreement_id", sa.Integer(), nullable=False, index=False),
        # TODO: Consider a way to make this possible. It's not right now because
        # there is no unique constraint on agreements.agreement_id
        # sa.ForeignKeyConstraint(['parent_agreement_id'], ['agreements.agreement_id'], ),
        # sa.ForeignKeyConstraint(['child_agreement_id'], ['agreements.agreement_id'], ),
        sa.PrimaryKeyConstraint("parent_agreement_id", "child_agreement_id"),
    )


def downgrade():
    op.drop_table("remixes")
