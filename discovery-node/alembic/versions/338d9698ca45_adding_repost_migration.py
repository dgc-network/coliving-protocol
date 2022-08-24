"""Adding repost migration

Revision ID: 338d9698ca45
Revises: 4ee3fec9c420
Create Date: 2019-01-28 11:25:08.903717

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "338d9698ca45"
down_revision = "4ee3fec9c420"
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table(
        "reposts",
        sa.Column("blockhash", sa.String(), nullable=False),
        sa.Column("blocknumber", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("repost_item_id", sa.Integer(), nullable=False),
        sa.Column(
            "repost_type",
            sa.Enum("agreement", "content_list", "album", name="reposttype"),
            nullable=False,
        ),
        sa.Column("is_current", sa.Boolean(), nullable=False),
        sa.Column("is_delete", sa.Boolean(), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["blockhash"],
            ["blocks.blockhash"],
        ),
        sa.ForeignKeyConstraint(
            ["blocknumber"],
            ["blocks.number"],
        ),
        sa.PrimaryKeyConstraint(
            "is_current", "user_id", "repost_item_id", "repost_type", "blockhash"
        ),
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table("reposts")
    # ### end Alembic commands ###
