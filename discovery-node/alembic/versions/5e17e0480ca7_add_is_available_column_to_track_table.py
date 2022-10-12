"""add is_available column to digital_content table

Revision ID: 5e17e0480ca7
Revises: a83814aeb4a1
Create Date: 2022-05-20 21:55:56.464788

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "5e17e0480ca7"
down_revision = "a83814aeb4a1"
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column(
        "agreements",
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default="true"),
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column("agreements", "is_available")
    # ### end Alembic commands ###
