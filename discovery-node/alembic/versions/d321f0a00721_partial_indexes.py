"""partial_indexes

Revision ID: d321f0a00721
Revises: 58c87cf2c7e6
Create Date: 2022-03-07 21:37:26.247264

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "d321f0a00721"
down_revision = "58c87cf2c7e6"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    query = """
    BEGIN;

    -- make digital_content_owner_id_idx a partial index
    DROP INDEX IF EXISTS digital_content_owner_id_idx;
    CREATE INDEX IF NOT EXISTS digital_content_owner_id_idx ON agreements (owner_id) WHERE is_current;

    -- add index for digital_content_created_at
    CREATE INDEX IF NOT EXISTS digital_content_created_at_idx ON agreements (created_at) WHERE is_current;

    -- add index for contentList owner
    CREATE INDEX IF NOT EXISTS content_list_owner_id_idx ON contentLists (content_list_owner_id) WHERE is_current;

    -- add index for content_list_created_at
    CREATE INDEX IF NOT EXISTS content_list_created_at_idx ON contentLists (created_at) WHERE is_current;

    -- make repost_user_id a partial index
    DROP INDEX IF EXISTS repost_user_id_idx;
    CREATE INDEX IF NOT EXISTS repost_user_id_idx ON reposts (user_id, repost_type) WHERE is_current;

    -- make repost_item_id a partial index
    DROP INDEX IF EXISTS repost_item_id_idx;
    CREATE INDEX IF NOT EXISTS repost_item_id_idx ON reposts (repost_item_id, repost_type) WHERE is_current;

    -- add index for repost_created_at
    CREATE INDEX IF NOT EXISTS repost_created_at_idx ON reposts (created_at) WHERE is_current;

    -- make followee_user_id a partial index
    DROP INDEX IF EXISTS ix_follows_followee_user_id;
    CREATE INDEX IF NOT EXISTS ix_follows_followee_user_id ON follows (followee_user_id) WHERE is_current;

    -- make follower_user_id a partial index
    DROP INDEX IF EXISTS ix_follows_follower_user_id;
    CREATE INDEX IF NOT EXISTS ix_follows_follower_user_id ON follows (follower_user_id) WHERE is_current;

    -- saves
    DROP INDEX IF EXISTS save_item_id_idx;
    CREATE INDEX IF NOT EXISTS save_item_id_idx ON saves (save_item_id, save_type) WHERE is_current;
    DROP INDEX IF EXISTS save_user_id_idx;
    CREATE INDEX IF NOT EXISTS save_user_id_idx ON saves (user_id, save_type) WHERE is_current;

    COMMIT;
    """
    conn.execute(query)


def downgrade():
    conn = op.get_bind()
    query = """
    BEGIN;

    -- digital_content owner + digital_content created_at
    DROP INDEX IF EXISTS digital_content_owner_id_idx;
    CREATE INDEX IF NOT EXISTS digital_content_owner_id_idx ON agreements (owner_id);
    DROP INDEX IF EXISTS digital_content_created_at_idx;

    -- contentList owner + contentList created_at
    DROP INDEX IF EXISTS content_list_owner_id_idx;
    DROP INDEX IF EXISTS content_list_created_at_idx;

    -- repost user
    DROP INDEX IF EXISTS repost_user_id_idx;
    CREATE INDEX IF NOT EXISTS repost_user_id_idx ON reposts (user_id, repost_type);

    -- repost item id + repost created at
    DROP INDEX IF EXISTS repost_item_id_idx;
    CREATE INDEX IF NOT EXISTS repost_item_id_idx ON reposts (repost_item_id, repost_type);
    DROP INDEX IF EXISTS repost_created_at_idx;


    -- follows partial index
    DROP INDEX IF EXISTS ix_follows_followee_user_id;
    CREATE INDEX IF NOT EXISTS ix_follows_followee_user_id ON follows (followee_user_id);

    DROP INDEX IF EXISTS ix_follows_follower_user_id;
    CREATE INDEX IF NOT EXISTS ix_follows_follower_user_id ON follows (follower_user_id);

    -- saves
    DROP INDEX IF EXISTS save_item_id_idx;
    CREATE INDEX IF NOT EXISTS save_item_id_idx ON saves (save_item_id, is_current, is_delete, save_type);
    DROP INDEX IF EXISTS save_user_id_idx;
    CREATE INDEX IF NOT EXISTS save_user_id_idx ON saves (user_id, is_current, is_delete, save_type);

    COMMIT;
    """
    conn.execute(query)
