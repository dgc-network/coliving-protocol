"""filter deletes from lexeme

Revision ID: b3084b7bc025
Revises: 61a2ec64d2cb
Create Date: 2020-02-20 10:49:50.076846

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b3084b7bc025"
down_revision = "61a2ec64d2cb"
branch_labels = None
depends_on = None


# Filter out deleted items from lexeme dictionary
# The client filters these out and can show incorrect counts of search results
# because of it.
def upgrade():
    connection = op.get_bind()
    connection.execute(
        """
      --- Filter deletes from digital_content_lexeme_dict.

      DROP MATERIALIZED VIEW digital_content_lexeme_dict;
      DROP INDEX IF EXISTS digital_content_words_idx;
      CREATE MATERIALIZED VIEW digital_content_lexeme_dict as
      SELECT * FROM (
        SELECT
          t.digital_content_id,
          t.title as digital_content_title,
          unnest(
            tsvector_to_array(
              to_tsvector(
                'coliving_ts_config',
                replace(COALESCE(t."title", ''), '&', 'and')
              )
            )
          ) as word
        FROM
            digitalContents t
        INNER JOIN users u ON t.owner_id = u.user_id
        WHERE
          t.is_current = true and
          t.is_unlisted = false and
          t.is_delete = false and
          u.is_current = true
        GROUP BY t.digital_content_id, t.title
      ) AS words;
      CREATE INDEX digital_content_words_idx ON digital_content_lexeme_dict USING gin(word gin_trgm_ops);


      --- Filter deletes from content_list_lexeme_dict and album_lexeme_dict.

      DROP MATERIALIZED VIEW content_list_lexeme_dict;
      DROP MATERIALIZED VIEW album_lexeme_dict;
      DROP INDEX IF EXISTS content_list_words_idx;
      DROP INDEX IF EXISTS album_words_idx;
      CREATE MATERIALIZED VIEW content_list_lexeme_dict as
      SELECT * FROM (
        SELECT
          p.content_list_id,
          p.content_list_name,
          unnest(
            tsvector_to_array(
              to_tsvector(
                'coliving_ts_config',
                replace(COALESCE(p.content_list_name, ''), '&', 'and')
              )
            )
          ) as word
        FROM
            contentLists p
        INNER JOIN users u ON p.content_list_owner_id = u.user_id
        WHERE
            p.is_current = true and
            p.is_album = false and
            p.is_private = false and
            p.is_delete = false and
            u.is_current = true
        GROUP BY p.content_list_id, p.content_list_name
      ) AS words;
      CREATE MATERIALIZED VIEW album_lexeme_dict as
      SELECT * FROM (
        SELECT
          p.content_list_id,
          p.content_list_name,
          unnest(
            tsvector_to_array(
              to_tsvector(
                'coliving_ts_config',
                replace(COALESCE(p.content_list_name, ''), '&', 'and')
              )
            )
          ) as word
        FROM
            contentLists p
        INNER JOIN users u ON p.content_list_owner_id = u.user_id
        WHERE
            p.is_current = true and
            p.is_album = true and
            p.is_private = false and
            p.is_delete = false and
            u.is_current = true
        GROUP BY p.content_list_id, p.content_list_name
      ) AS words;
      CREATE INDEX content_list_words_idx ON content_list_lexeme_dict USING gin(word gin_trgm_ops);
      CREATE INDEX album_words_idx ON album_lexeme_dict USING gin(word gin_trgm_ops);
    """
    )


def downgrade():
    pass
