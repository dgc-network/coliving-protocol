"""add aggregate digital_content table

Revision ID: dc7f691adc79
Revises: b734b7b47fca
Create Date: 2022-01-20 18:21:40.504845

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "dc7f691adc79"
down_revision = "b734b7b47fca"
branch_labels = None
depends_on = None

CASCADING_SCHEMA = """
      begin;
        DROP MATERIALIZED VIEW IF EXISTS digital_content_lexeme_dict;
        DROP INDEX IF EXISTS digital_content_words_idx;

        CREATE MATERIALIZED VIEW digital_content_lexeme_dict as
        SELECT row_number() OVER (PARTITION BY true), * FROM (
            SELECT
                t.digital_content_id,
                t.owner_id as owner_id,
                lower(t.title) as digital_content_title,
                lower(u.handle) as handle,
                lower(u.name) as user_name,
                a.repost_count as repost_count,
                unnest(
                    tsvector_to_array(
                        to_tsvector(
                            'coliving_ts_config',
                            replace(COALESCE(t."title", ''), '&', 'and')
                        )
                    ) || lower(COALESCE(t."title", ''))
                ) AS word
            FROM
                digitalContents t
            INNER JOIN users u ON t.owner_id = u.user_id
            INNER JOIN aggregate_digital_content a ON a.digital_content_id = t.digital_content_id
            WHERE t.is_current = true AND t.is_unlisted = false AND t.is_delete = false AND t.stem_of IS NULL AND u.is_current = true AND
            u.user_id NOT IN (
          SELECT u.user_id FROM users u
          INNER JOIN
            (
              SELECT distinct lower(u1.handle) AS handle, u1.user_id FROM users u1
              WHERE u1.is_current = true AND u1.is_verified = true
            ) AS sq
          ON lower(u.name) = sq.handle AND u.user_id != sq.user_id
          WHERE u.is_current = true
        )
            GROUP BY t.digital_content_id, t.title, t.owner_id, u.handle, u.name, a.repost_count
        ) AS words;

        CREATE INDEX digital_content_words_idx ON digital_content_lexeme_dict USING gin(word gin_trgm_ops);
        CREATE INDEX digital_content_user_name_idx ON digital_content_lexeme_dict USING gin(user_name gin_trgm_ops);
        CREATE INDEX digitalContents_user_handle_idx ON digital_content_lexeme_dict(handle);
        CREATE UNIQUE INDEX digital_content_row_number_idx ON digital_content_lexeme_dict(row_number);

        DROP MATERIALIZED VIEW IF EXISTS trending_params;
        CREATE MATERIALIZED VIEW trending_params as
          SELECT
              t.digital_content_id as digital_content_id,
              t.genre as genre,
              t.owner_id as owner_id,
              ap.play_count as play_count,
              au.follower_count as owner_follower_count,
              COALESCE (aggregate_digital_content.repost_count, 0) as repost_count,
              COALESCE (aggregate_digital_content.save_count, 0) as save_count,
              COALESCE (repost_week.repost_count, 0) as repost_week_count,
              COALESCE (repost_month.repost_count, 0) as repost_month_count,
              COALESCE (repost_year.repost_count, 0) as repost_year_count,
              COALESCE (save_week.repost_count, 0) as save_week_count,
              COALESCE (save_month.repost_count, 0) as save_month_count,
              COALESCE (save_year.repost_count, 0) as save_year_count,
              COALESCE (karma.karma, 0) as karma
          FROM
              digitalContents t
          -- join on subquery for aggregate play count
          LEFT OUTER JOIN (
              SELECT
                  ap.count as play_count,
                  ap.play_item_id as play_item_id
              FROM
                  aggregate_plays ap
          ) as ap ON ap.play_item_id = t.digital_content_id
          -- join on subquery for aggregate user
          LEFT OUTER JOIN (
              SELECT
                  au.user_id as user_id,
                  au.follower_count as follower_count
              FROM
                  aggregate_user au
          ) as au ON au.user_id = t.owner_id
          -- join on subquery for aggregate digital_content
          LEFT OUTER JOIN (
              SELECT
                  aggregate_digital_content.digital_content_id as digital_content_id,
                  aggregate_digital_content.repost_count as repost_count,
                  aggregate_digital_content.save_count as save_count
              FROM
                  aggregate_digital_content
          ) as aggregate_digital_content ON aggregate_digital_content.digital_content_id = t.digital_content_id
          -- -- join on subquery for reposts by year
          LEFT OUTER JOIN (
              SELECT
                  r.repost_item_id as digital_content_id,
                  count(r.repost_item_id) as repost_count
              FROM
                  reposts r
              WHERE
                  r.is_current is True AND
                  r.repost_type = 'digital_content' AND
                  r.is_delete is False AND
                  r.created_at > (now() - interval '1 year')
              GROUP BY r.repost_item_id
          ) repost_year ON repost_year.digital_content_id = t.digital_content_id
          -- -- join on subquery for reposts by month
          LEFT OUTER JOIN (
              SELECT
                  r.repost_item_id as digital_content_id,
                  count(r.repost_item_id) as repost_count
              FROM
                  reposts r
              WHERE
                  r.is_current is True AND
                  r.repost_type = 'digital_content' AND
                  r.is_delete is False AND
                  r.created_at > (now() - interval '1 month')
              GROUP BY r.repost_item_id
          ) repost_month ON repost_month.digital_content_id = t.digital_content_id
          -- -- join on subquery for reposts by week
          LEFT OUTER JOIN (
              SELECT
                  r.repost_item_id as digital_content_id,
                  count(r.repost_item_id) as repost_count
              FROM
                  reposts r
              WHERE
                  r.is_current is True AND
                  r.repost_type = 'digital_content' AND
                  r.is_delete is False AND
                  r.created_at > (now() - interval '1 week')
              GROUP BY r.repost_item_id
          ) repost_week ON repost_week.digital_content_id = t.digital_content_id
          -- -- join on subquery for saves by year
          LEFT OUTER JOIN (
              SELECT
                  r.save_item_id as digital_content_id,
                  count(r.save_item_id) as repost_count
              FROM
                  saves r
              WHERE
                  r.is_current is True AND
                  r.save_type = 'digital_content' AND
                  r.is_delete is False AND
                  r.created_at > (now() - interval '1 year')
              GROUP BY r.save_item_id
          ) save_year ON save_year.digital_content_id = t.digital_content_id
          -- -- join on subquery for saves by month
          LEFT OUTER JOIN (
              SELECT
                  r.save_item_id as digital_content_id,
                  count(r.save_item_id) as repost_count
              FROM
                  saves r
              WHERE
                  r.is_current is True AND
                  r.save_type = 'digital_content' AND
                  r.is_delete is False AND
                  r.created_at > (now() - interval '1 month')
              GROUP BY r.save_item_id
          ) save_month ON save_month.digital_content_id = t.digital_content_id
          -- -- join on subquery for saves by week
          LEFT OUTER JOIN (
              SELECT
                  r.save_item_id as digital_content_id,
                  count(r.save_item_id) as repost_count
              FROM
                  saves r
              WHERE
                  r.is_current is True AND
                  r.save_type = 'digital_content' AND
                  r.is_delete is False AND
                  r.created_at > (now() - interval '1 week')
              GROUP BY r.save_item_id
          ) save_week ON save_week.digital_content_id = t.digital_content_id
          LEFT OUTER JOIN (
              SELECT
                  save_and_reposts.item_id as digital_content_id,
                  sum(au.follower_count) as karma
              FROM
                  (
                      select
                          r_and_s.user_id,
                          r_and_s.item_id
                      from
                          (select
                              user_id,
                              repost_item_id as item_id
                          from
                              reposts
                          where
                              is_delete is false AND
                              is_current is true AND
                              repost_type = 'digital_content'
                          union all
                          select
                              user_id,
                              save_item_id as item_id
                          from
                              saves
                          where
                              is_delete is false AND
                              is_current is true AND
                              save_type = 'digital_content'
                          ) r_and_s
                      join
                          users
                      on r_and_s.user_id = users.user_id
                      where
                          (
                              users.cover_photo is not null OR
                              users.cover_photo_sizes is not null
                          ) AND
                          (
                              users.profile_picture is not null OR
                              users.profile_picture_sizes is not null
                          ) AND
                          users.bio is not null
                  ) save_and_reposts
              JOIN
                  aggregate_user au
              ON
                  save_and_reposts.user_id = au.user_id
              GROUP BY save_and_reposts.item_id
          ) karma ON karma.digital_content_id = t.digital_content_id
          WHERE
              t.is_current is True AND
              t.is_delete is False AND
              t.is_unlisted is False AND
              t.stem_of is Null;

        CREATE INDEX trending_params_digital_content_id_idx ON trending_params (digital_content_id);

      commit;
    """


def upgrade():
    connection = op.get_bind()
    query = """
      DO
      $do$
      begin
        IF NOT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'aggregate_digital_content'
        ) THEN
          DROP TABLE IF EXISTS aggregate_digital_content_table;
          CREATE TABLE aggregate_digital_content_table (
              digital_content_id     integer NOT NULL UNIQUE PRIMARY KEY,
              repost_count integer NOT NULL,
              save_count   integer NOT NULL
          );
          DROP MATERIALIZED VIEW IF EXISTS aggregate_digital_content CASCADE;
          ALTER TABLE aggregate_digital_content_table RENAME TO aggregate_digital_content;
        END IF;
      END
      $do$
    """

    connection.execute(query)
    connection.execute(CASCADING_SCHEMA)


def downgrade():
    connection = op.get_bind()
    connection.execute(
        """
      begin;
        DROP TABLE IF EXISTS aggregate_digital_content CASCADE;

        DROP MATERIALIZED VIEW IF EXISTS aggregate_digital_content;
        DROP INDEX IF EXISTS aggregate_digital_content_idx;

        CREATE MATERIALIZED VIEW aggregate_digital_content as
        SELECT
          t.digital_content_id,
          COALESCE (digital_content_repost.repost_count, 0) as repost_count,
          COALESCE (digital_content_save.save_count, 0) as save_count
        FROM 
          digitalContents t
        -- inner join on subquery for reposts
        LEFT OUTER JOIN (
          SELECT
            r.repost_item_id as digital_content_id,
            count(r.repost_item_id) as repost_count
          FROM
            reposts r
          WHERE
            r.is_current is True AND
            r.repost_type = 'digital_content' AND
            r.is_delete is False
          GROUP BY r.repost_item_id
        ) digital_content_repost ON digital_content_repost.digital_content_id = t.digital_content_id
        -- inner join on subquery for digital_content saves
        LEFT OUTER JOIN (
          SELECT
            s.save_item_id as digital_content_id,
            count(s.save_item_id) as save_count
          FROM
            saves s
          WHERE
            s.is_current is True AND
            s.save_type = 'digital_content' AND
            s.is_delete is False
          GROUP BY s.save_item_id
        ) digital_content_save ON digital_content_save.digital_content_id = t.digital_content_id
        WHERE
          t.is_current is True AND
          t.is_delete is False;

        CREATE UNIQUE INDEX aggregate_digital_content_idx ON aggregate_digital_content (digital_content_id);
      commit;
    """
    )
    connection.execute(CASCADING_SCHEMA)
