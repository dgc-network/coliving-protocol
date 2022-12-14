"""fix_primary_key_constraints

Revision ID: bff7853e0983
Revises: 8a07fa2fe97b
Create Date: 2021-04-03 11:51:24.385460

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "bff7853e0983"
down_revision = "8a07fa2fe97b"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()

    connection.execute(
        """
        begin;
            ALTER TABLE users DROP CONSTRAINT users_pkey;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS txhash VARCHAR DEFAULT('') NOT NULL;
            ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (is_current, user_id, blockhash, txhash);

            ALTER TABLE ursm_content_nodes DROP CONSTRAINT ursm_content_nodes_pkey;
            ALTER TABLE ursm_content_nodes ADD COLUMN IF NOT EXISTS txhash VARCHAR DEFAULT('') NOT NULL;
            ALTER TABLE ursm_content_nodes ADD CONSTRAINT ursm_content_nodes_pkey PRIMARY KEY (is_current, cnode_sp_id, blockhash, txhash);

            ALTER TABLE digitalContents DROP CONSTRAINT digitalContents_pkey;
            ALTER TABLE digitalContents ADD COLUMN IF NOT EXISTS txhash VARCHAR DEFAULT('') NOT NULL;
            ALTER TABLE digitalContents ADD CONSTRAINT digitalContents_pkey PRIMARY KEY (is_current, digital_content_id, blockhash, txhash);

            ALTER TABLE contentLists DROP CONSTRAINT content_lists_pkey;
            ALTER TABLE contentLists ADD COLUMN IF NOT EXISTS txhash VARCHAR DEFAULT('') NOT NULL;
            ALTER TABLE contentLists ADD CONSTRAINT content_lists_pkey PRIMARY KEY (is_current, content_list_id, content_list_owner_id, blockhash, txhash);

            ALTER TABLE reposts DROP CONSTRAINT reposts_pkey;
            ALTER TABLE reposts ADD COLUMN IF NOT EXISTS txhash VARCHAR DEFAULT('') NOT NULL;
            ALTER TABLE reposts ADD CONSTRAINT reposts_pkey PRIMARY KEY (is_current, user_id, repost_item_id, repost_type, blockhash, txhash);

            ALTER TABLE saves DROP CONSTRAINT saves_pkey;
            ALTER TABLE saves ADD COLUMN IF NOT EXISTS txhash VARCHAR DEFAULT('') NOT NULL;
            ALTER TABLE saves ADD CONSTRAINT saves_pkey PRIMARY KEY (is_current, user_id, save_item_id, save_type, blockhash, txhash);

            ALTER TABLE follows DROP CONSTRAINT follows_pkey;
            ALTER TABLE follows ADD COLUMN IF NOT EXISTS txhash VARCHAR DEFAULT('') NOT NULL;
            ALTER TABLE follows ADD CONSTRAINT follows_pkey PRIMARY KEY (is_current, follower_user_id, followee_user_id, blockhash, txhash);
        commit;
    """
    )


def downgrade():
    connection = op.get_bind()

    connection.execute(
        """
        begin;
            ALTER TABLE users DROP CONSTRAINT users_pkey;
            ALTER TABLE users DROP COLUMN txhash;
            ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (is_current, user_id, blockhash);

            ALTER TABLE ursm_content_nodes DROP CONSTRAINT ursm_content_nodes_pkey;
            ALTER TABLE ursm_content_nodes DROP COLUMN txhash;
            ALTER TABLE ursm_content_nodes ADD CONSTRAINT ursm_content_nodes_pkey PRIMARY KEY (is_current, cnode_sp_id, blockhash);

            ALTER TABLE digitalContents DROP CONSTRAINT digitalContents_pkey;
            ALTER TABLE digitalContents DROP COLUMN txhash;
            ALTER TABLE digitalContents ADD CONSTRAINT digitalContents_pkey PRIMARY KEY (is_current, digital_content_id, blockhash);

            ALTER TABLE contentLists DROP CONSTRAINT content_lists_pkey;
            ALTER TABLE contentLists DROP COLUMN txhash;
            ALTER TABLE contentLists ADD CONSTRAINT content_lists_pkey PRIMARY KEY (is_current, content_list_id, content_list_owner_id, blockhash);

            ALTER TABLE reposts DROP CONSTRAINT reposts_pkey;
            ALTER TABLE reposts DROP COLUMN txhash;
            ALTER TABLE reposts ADD CONSTRAINT reposts_pkey PRIMARY KEY (is_current, user_id, repost_item_id, repost_type, blockhash);

            ALTER TABLE saves DROP CONSTRAINT saves_pkey;
            ALTER TABLE saves DROP COLUMN txhash;
            ALTER TABLE saves ADD CONSTRAINT saves_pkey PRIMARY KEY (is_current, user_id, save_item_id, save_type, blockhash);

            ALTER TABLE follows DROP CONSTRAINT follows_pkey;
            ALTER TABLE follows DROP COLUMN txhash;
            ALTER TABLE follows ADD CONSTRAINT follows_pkey PRIMARY KEY (is_current, follower_user_id, followee_user_id, blockhash);
        commit;
    """
    )
