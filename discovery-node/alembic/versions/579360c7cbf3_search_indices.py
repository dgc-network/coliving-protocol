"""search indices

Revision ID: 579360c7cbf3
Revises: a88a8ce41f7d
Create Date: 2021-02-11 20:57:58.269861

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "579360c7cbf3"
down_revision = "a88a8ce41f7d"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        op.f("ix_user_lexeme_dict"),
        "user_lexeme_dict",
        ["user_id", "user_name", "word"],
        unique=True,
    )
    op.create_index(
        op.f("ix_digital_content_lexeme_dict"),
        "digital_content_lexeme_dict",
        ["digital_content_id", "digital_content_title", "word"],
        unique=True,
    )
    op.create_index(
        op.f("ix_content_list_lexeme_dict"),
        "content_list_lexeme_dict",
        ["content_list_id", "content_list_name", "word"],
        unique=True,
    )
    op.create_index(
        op.f("ix_album_lexeme_dict"),
        "album_lexeme_dict",
        ["content_list_id", "content_list_name", "word"],
        unique=True,
    )


def downgrade():
    op.drop_index(op.f("ix_user_lexeme_dict"), table_name="user_lexeme_dict")
    op.drop_index(op.f("ix_digital_content_lexeme_dict"), table_name="digital_content_lexeme_dict")
    op.drop_index(op.f("ix_content_list_lexeme_dict"), table_name="content_list_lexeme_dict")
    op.drop_index(op.f("ix_album_lexeme_dict"), table_name="album_lexeme_dict")
