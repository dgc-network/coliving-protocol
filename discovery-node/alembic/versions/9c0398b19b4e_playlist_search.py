"""contentList search

Revision ID: 9c0398b19b4e
Revises: 9e9acd8a115a
Create Date: 2019-03-08 10:40:15.160352

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9c0398b19b4e"
down_revision = "9e9acd8a115a"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()

    # contentList search index
    connection.execute(
        """
      -- since search fields are spread across multiple tables, denormalize data via materialized view
      --  - use custom text search config in building documents
      --  - document consists of every word from dictionary present in given dataset
      --  -   (accomplished with to_tsvector() and tsvector_to_array() functions)
      --  - dataset = (user name + user handle)
      --  - view row consists of unique user id + word pairs (accomplished via unnest())
      --  - all future searches can then do comparisons against any word present in documents,
      --  -   and retrieve associated user id
      CREATE MATERIALIZED VIEW contentList_lexeme_dict as
      SELECT * FROM (
        SELECT
          p.contentList_id,
          unnest(tsvector_to_array(to_tsvector('coliving_ts_config', replace(COALESCE(p."contentList_name", ''), '&', 'and')))) as word
        FROM
            "contentLists" p
        WHERE p."is_current" = true and p."is_album" = false and p."is_private" = false
        GROUP BY p."contentList_id", p."contentList_name"
      ) AS words;

      -- add index on above materialized view
      CREATE INDEX contentList_words_idx ON contentList_lexeme_dict USING gin(word gin_trgm_ops);
    """
    )

    connection.execute(
        """
      -- since search fields are spread across multiple tables, denormalize data via materialized view
      --  - use custom text search config in building documents
      --  - document consists of every word from dictionary present in given dataset
      --  -   (accomplished with to_tsvector() and tsvector_to_array() functions)
      --  - dataset = (user name + user handle)
      --  - view row consists of unique user id + word pairs (accomplished via unnest())
      --  - all future searches can then do comparisons against any word present in documents,
      --  -   and retrieve associated user id
      CREATE MATERIALIZED VIEW album_lexeme_dict as
      SELECT * FROM (
        SELECT
          p.contentList_id,
          unnest(tsvector_to_array(to_tsvector('coliving_ts_config', replace(COALESCE(p."contentList_name", ''), '&', 'and')))) as word
        FROM
            "contentLists" p
        WHERE p."is_current" = true and p."is_album" = true and p."is_private" = false
        GROUP BY p."contentList_id", p."contentList_name"
      ) AS words;

      -- add index on above materialized view
      CREATE INDEX album_words_idx ON album_lexeme_dict USING gin(word gin_trgm_ops);
    """
    )


def downgrade():
    pass
