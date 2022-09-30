"""solana slot social

Revision ID: 3a3f2c9f5320
Revises: 2dbbc9c484e3
Create Date: 2022-04-10 20:13:10.421757

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "3a3f2c9f5320"
down_revision = "2dbbc9c484e3"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    connection.execute(
        """
        begin;

            ALTER TABLE contentLists DROP CONSTRAINT IF EXISTS content_lists_pkey;
            UPDATE contentLists
                SET txhash = ('unset_' || substr(md5(random()::text), 0, 10) || substr(blockhash, 3, 13))
                WHERE txhash='';

            ALTER TABLE contentLists ADD PRIMARY KEY (is_current, content_list_id, txhash);

            ALTER TABLE contentLists ADD COLUMN IF NOT EXISTS slot INTEGER;

            -- Drop NOT NULL Constraint on DATA blockhash and tx hash columns
            ALTER TABLE contentLists ALTER COLUMN blockhash DROP NOT NULL;
            ALTER TABLE contentLists ALTER COLUMN blocknumber DROP NOT NULL;

        commit;
    """
    )


def downgrade():
    connection = op.get_bind()
    connection.execute(
        """
        begin;

            ALTER TABLE contentLists DROP CONSTRAINT IF EXISTS content_lists_pkey;
            ALTER TABLE contentLists ADD PRIMARY KEY (is_current, content_list_id, content_list_owner_id, blockhash, txhash);

            ALTER TABLE contentLists DROP COLUMN IF EXISTS slot;

            -- Add NOT NULL Constraint on DATA blockhash and tx hash columns
            DELETE FROM contentLists where blockhash IS NULL or blocknumber IS NULL;
            ALTER TABLE contentLists ALTER COLUMN blockhash SET NOT NULL;
            ALTER TABLE contentLists ALTER COLUMN blocknumber SET NOT NULL;

            UPDATE contentLists SET txhash = '' WHERE txhash LIKE 'unset_%%';

        commit;
    """
    )
