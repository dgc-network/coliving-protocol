"""reasdf

Revision ID: 61a2ec64d2cb
Revises: 6a97af9e5058
Create Date: 2019-12-24 11:53:04.267648

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "61a2ec64d2cb"
down_revision = "6a97af9e5058"
branch_labels = None
depends_on = None


# Add col to search views to remove inner join in search queries.
def upgrade():
    connection = op.get_bind()
    connection.execute(
        """
      --- Add "name" field to user_lexeme_dict.
      
      DROP MATERIALIZED VIEW user_lexeme_dict;
      DROP INDEX IF EXISTS user_words_idx;
      CREATE MATERIALIZED VIEW user_lexeme_dict as
      SELECT * FROM (
        SELECT
          u.user_id,
          u.name as user_name,
          unnest(
            tsvector_to_array(
              to_tsvector(
                'coliving_ts_config',
                replace(COALESCE(u.name, ''), '&', 'and')
              ) ||
              to_tsvector(
                'coliving_ts_config',
                COALESCE(u.handle, '')
              )
            )
          ) as word
        FROM
            users u
        WHERE u.is_current = true
        GROUP BY u.user_id, u.name, u.handle
      ) AS words;
      CREATE INDEX user_words_idx ON user_lexeme_dict USING gin(word gin_trgm_ops);


      --- Add "title" field to digital_content_lexeme_dict.

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
            agreements t
        INNER JOIN users u ON t.owner_id = u.user_id
        WHERE
          t.is_current = true and t.is_unlisted = false
          and u.is_current = true
        GROUP BY t.digital_content_id, t.title
      ) AS words;
      CREATE INDEX digital_content_words_idx ON digital_content_lexeme_dict USING gin(word gin_trgm_ops);


      --- Add "content_list_name" field to content_list_lexeme_dict and album_lexeme_dict;

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
            p.is_current = true and p.is_album = false and p.is_private = false
            and u.is_current = true
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
            p.is_current = true and p.is_album = true and p.is_private = false
            and u.is_current = true
        GROUP BY p.content_list_id, p.content_list_name
      ) AS words;
      CREATE INDEX content_list_words_idx ON content_list_lexeme_dict USING gin(word gin_trgm_ops);
      CREATE INDEX album_words_idx ON album_lexeme_dict USING gin(word gin_trgm_ops);
    """
    )


def downgrade():
    pass
