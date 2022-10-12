"""init db state

Revision ID: 6bd5882912c8
Revises: 2571ec7593c7
Create Date: 2018-11-26 16:50:51.181473
Description:
  - this migration must run after DB models migration, as it configures db based on existing models
  - since it involves db config instead of models, it cannot be auto-generated
  - configures DB for customized performant fuzzy full text search
  - modeled off: http://rachbelaid.com/postgres-full-text-search-is-good-enough/
"""
from alembic import op
import sqlalchemy as sa
import logging


# revision identifiers, used by Alembic.
revision = "6bd5882912c8"
down_revision = "3065a825c5f8"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()

    # DB setup
    connection.execute(
        """
      -- create custom text search dictionary to include stop words and not normalize words
      CREATE TEXT SEARCH DICTIONARY coliving_ts_dict (
          TEMPLATE = pg_catalog.simple
      );

      -- create custom search configuration using new dictionary
      CREATE TEXT SEARCH CONFIGURATION public.coliving_ts_config (
        COPY = pg_catalog.english
      );
      ALTER TEXT SEARCH CONFIGURATION public.coliving_ts_config
        ALTER MAPPING FOR asciiword, asciihword, hword_asciipart, hword, hword_part, word WITH coliving_ts_dict;

      -- loads extension into db; pg_trgm = compares string similarity by trigram matching
      CREATE EXTENSION pg_trgm;
    """
    )

    # DigitalContent search index
    connection.execute(
        """
      -- since search fields are spread across multiple tables, denormalize data via materialized view
      --  - use custom text search config in building documents
      --  - document consists of every word from dictionary present in given dataset
      --  -   (accomplished with to_tsvector() and tsvector_to_array() functions)
      --  - dataset = (digital_content title + digital_content tags)
      --  - view row consists of unique digital_content id + word pairs (accomplished via unnest())
      --  - all future searches can then do comparisons against any word present in documents,
      --  -   and retrieve associated digital_content id
      CREATE MATERIALIZED VIEW digital_content_lexeme_dict as
      SELECT * FROM (
        SELECT
          t.digital_content_id,
          unnest(tsvector_to_array(to_tsvector('coliving_ts_config', replace(COALESCE(t."title", ''), '&', 'and')) ||
          to_tsvector('coliving_ts_config', COALESCE(t."tags", '')))) as word
        FROM
            "digitalContents" t
        INNER JOIN "users" u ON t."owner_id" = u."user_id"
        WHERE t."is_current" = true and u."is_ready" = true and u."is_current" = true
        GROUP BY t."digital_content_id", t."title", t."tags"
      ) AS words;

      -- add index on above materialized view
      CREATE INDEX digital_content_words_idx ON digital_content_lexeme_dict USING gin(word gin_trgm_ops);
    """
    )

    # User search index
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
      CREATE MATERIALIZED VIEW user_lexeme_dict as
      SELECT * FROM (
        SELECT
          u.user_id,
          unnest(tsvector_to_array(to_tsvector('coliving_ts_config', replace(COALESCE(u."name", ''), '&', 'and')) ||
          to_tsvector('coliving_ts_config', COALESCE(u."handle", '')))) as word
        FROM
            "users" u
        WHERE u."is_current" = true and u."is_ready" = true
        GROUP BY u."user_id", u."name", u."handle"
      ) AS words;

      -- add index on above materialized view
      CREATE INDEX user_words_idx ON user_lexeme_dict USING gin(word gin_trgm_ops);
    """
    )


def downgrade():
    pass
