"""fix primary keys

Revision ID: 60cc872cd012
Revises: d615bdcc0e56
Create Date: 2022-07-01 06:49:44.267816

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "60cc872cd012"
down_revision = "d615bdcc0e56"
branch_labels = None
depends_on = None


def upgrade():
    """
    This migration fixes tables that are missing primary keys.
    """
    connection = op.get_bind()
    connection.execute(
        """
        ALTER TABLE aggregate_plays DROP CONSTRAINT IF EXISTS play_item_id_pkey;
        ALTER TABLE aggregate_plays ADD CONSTRAINT play_item_id_pkey PRIMARY KEY (play_item_id);
        DROP INDEX IF EXISTS play_item_id_idx;

        ALTER TABLE plays_archive DROP CONSTRAINT IF EXISTS plays_archive_id_pkey;
        ALTER TABLE plays_archive ADD CONSTRAINT plays_archive_id_pkey PRIMARY KEY (id);

        -- Remove duplicates from remixes
        DELETE
        FROM "stems" T1
        USING "stems" T2
        WHERE
            T1.ctid < T2.ctid
            AND T1.parent_digital_content_id = T2.parent_digital_content_id
            AND T1.child_digital_content_id = T2.child_digital_content_id;

        ALTER TABLE remixes DROP CONSTRAINT IF EXISTS remixes_pkey;
        ALTER TABLE remixes ADD CONSTRAINT remixes_pkey PRIMARY KEY (parent_digital_content_id, child_digital_content_id);

        -- Remove duplicates from stems
        DELETE
        FROM "stems" T1
        USING "stems" T2
        WHERE
            T1.ctid < T2.ctid
            AND T1.parent_digital_content_id = T2.parent_digital_content_id
            AND T1.child_digital_content_id = T2.child_digital_content_id;

        ALTER TABLE stems DROP CONSTRAINT IF EXISTS stems_pkey;
        ALTER TABLE stems ADD CONSTRAINT stems_pkey PRIMARY KEY (parent_digital_content_id, child_digital_content_id);
        """
    )


def downgrade():
    pass
