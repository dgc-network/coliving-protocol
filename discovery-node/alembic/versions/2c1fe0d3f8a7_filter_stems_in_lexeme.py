"""filter-stems-in-lexeme

Revision ID: 2c1fe0d3f8a7
Revises: 7b3f27e78b84
Create Date: 2020-05-19 15:58:39.362664

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "2c1fe0d3f8a7"
down_revision = "7b3f27e78b84"
branch_labels = None
depends_on = None


# Filter out stem items from lexeme dictionary
def upgrade():
    # Copied from revision = 'b3084b7bc025' with one change
    # `t.stem_of IS NULL`
    connection = op.get_bind()
    connection.execute(
        """
      --- Filter deletes from agreement_lexeme_dict.

      DROP MATERIALIZED VIEW agreement_lexeme_dict;
      DROP INDEX IF EXISTS agreement_words_idx;
      CREATE MATERIALIZED VIEW agreement_lexeme_dict as
      SELECT * FROM (
        SELECT
          t.agreement_id,
          t.title as agreement_title,
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
          t.is_current = true and
          t.is_unlisted = false and
          t.is_delete = false and
          t.stem_of IS NULL and
          u.is_current = true
        GROUP BY t.agreement_id, t.title
      ) AS words;
      CREATE INDEX agreement_words_idx ON agreement_lexeme_dict USING gin(word gin_trgm_ops);


      --- Filter deletes from contentList_lexeme_dict and album_lexeme_dict.

      DROP MATERIALIZED VIEW contentList_lexeme_dict;
      DROP MATERIALIZED VIEW album_lexeme_dict;
      DROP INDEX IF EXISTS contentList_words_idx;
      DROP INDEX IF EXISTS album_words_idx;
      CREATE MATERIALIZED VIEW contentList_lexeme_dict as
      SELECT * FROM (
        SELECT
          p.contentList_id,
          p.contentList_name,
          unnest(
            tsvector_to_array(
              to_tsvector(
                'coliving_ts_config',
                replace(COALESCE(p.contentList_name, ''), '&', 'and')
              )
            )
          ) as word
        FROM
            contentLists p
        INNER JOIN users u ON p.contentList_owner_id = u.user_id
        WHERE
            p.is_current = true and
            p.is_album = false and
            p.is_private = false and
            p.is_delete = false and
            u.is_current = true
        GROUP BY p.contentList_id, p.contentList_name
      ) AS words;
      CREATE MATERIALIZED VIEW album_lexeme_dict as
      SELECT * FROM (
        SELECT
          p.contentList_id,
          p.contentList_name,
          unnest(
            tsvector_to_array(
              to_tsvector(
                'coliving_ts_config',
                replace(COALESCE(p.contentList_name, ''), '&', 'and')
              )
            )
          ) as word
        FROM
            contentLists p
        INNER JOIN users u ON p.contentList_owner_id = u.user_id
        WHERE
            p.is_current = true and
            p.is_album = true and
            p.is_private = false and
            p.is_delete = false and
            u.is_current = true
        GROUP BY p.contentList_id, p.contentList_name
      ) AS words;
      CREATE INDEX contentList_words_idx ON contentList_lexeme_dict USING gin(word gin_trgm_ops);
      CREATE INDEX album_words_idx ON album_lexeme_dict USING gin(word gin_trgm_ops);
    """
    )


def downgrade():
    # Copied from revision = 'b3084b7bc025'
    connection = op.get_bind()
    connection.execute(
        """
      --- Filter deletes from agreement_lexeme_dict.

      DROP MATERIALIZED VIEW agreement_lexeme_dict;
      DROP INDEX IF EXISTS agreement_words_idx;
      CREATE MATERIALIZED VIEW agreement_lexeme_dict as
      SELECT * FROM (
        SELECT
          t.agreement_id,
          t.title as agreement_title,
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
          t.is_current = true and
          t.is_unlisted = false and
          t.is_delete = false and
          u.is_current = true
        GROUP BY t.agreement_id, t.title
      ) AS words;
      CREATE INDEX agreement_words_idx ON agreement_lexeme_dict USING gin(word gin_trgm_ops);


      --- Filter deletes from contentList_lexeme_dict and album_lexeme_dict.

      DROP MATERIALIZED VIEW contentList_lexeme_dict;
      DROP MATERIALIZED VIEW album_lexeme_dict;
      DROP INDEX IF EXISTS contentList_words_idx;
      DROP INDEX IF EXISTS album_words_idx;
      CREATE MATERIALIZED VIEW contentList_lexeme_dict as
      SELECT * FROM (
        SELECT
          p.contentList_id,
          p.contentList_name,
          unnest(
            tsvector_to_array(
              to_tsvector(
                'coliving_ts_config',
                replace(COALESCE(p.contentList_name, ''), '&', 'and')
              )
            )
          ) as word
        FROM
            contentLists p
        INNER JOIN users u ON p.contentList_owner_id = u.user_id
        WHERE
            p.is_current = true and
            p.is_album = false and
            p.is_private = false and
            p.is_delete = false and
            u.is_current = true
        GROUP BY p.contentList_id, p.contentList_name
      ) AS words;
      CREATE MATERIALIZED VIEW album_lexeme_dict as
      SELECT * FROM (
        SELECT
          p.contentList_id,
          p.contentList_name,
          unnest(
            tsvector_to_array(
              to_tsvector(
                'coliving_ts_config',
                replace(COALESCE(p.contentList_name, ''), '&', 'and')
              )
            )
          ) as word
        FROM
            contentLists p
        INNER JOIN users u ON p.contentList_owner_id = u.user_id
        WHERE
            p.is_current = true and
            p.is_album = true and
            p.is_private = false and
            p.is_delete = false and
            u.is_current = true
        GROUP BY p.contentList_id, p.contentList_name
      ) AS words;
      CREATE INDEX contentList_words_idx ON contentList_lexeme_dict USING gin(word gin_trgm_ops);
      CREATE INDEX album_words_idx ON album_lexeme_dict USING gin(word gin_trgm_ops);
    """
    )
