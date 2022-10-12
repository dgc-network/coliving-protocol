"""add trending views

Revision ID: 92571f94989a
Revises: 65ec7a3171c7
Create Date: 2021-09-22 16:27:23.281441

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "92571f94989a"
down_revision = "65ec7a3171c7"
branch_labels = None
depends_on = None


def upgrade():

    connection = op.get_bind()
    connection.execute(
        """
        DROP MATERIALIZED VIEW IF EXISTS aggregate_interval_plays;

        CREATE MATERIALIZED VIEW aggregate_interval_plays as
        SELECT
            digitalContents.digital_content_id as digital_content_id,
            digitalContents.genre as genre,
            digitalContents.created_at as created_at,
            COALESCE (week_listen_counts.count, 0) as week_listen_counts,
            COALESCE (month_listen_counts.count, 0) as month_listen_counts,
            COALESCE (year_listen_counts.count, 0) as year_listen_counts
        FROM
            digitalContents
        LEFT OUTER JOIN (
            SELECT
                plays.play_item_id as play_item_id,
                count(plays.id) as count
            FROM
                plays
            WHERE
                plays.created_at > (now() - interval '1 week')
            GROUP BY plays.play_item_id
        ) as week_listen_counts ON week_listen_counts.play_item_id = digitalContents.digital_content_id
        LEFT OUTER JOIN (
            SELECT
                plays.play_item_id as play_item_id,
                count(plays.id) as count
            FROM
                plays
            WHERE
                plays.created_at > (now() - interval '1 month')
            GROUP BY plays.play_item_id
        ) as month_listen_counts ON month_listen_counts.play_item_id = digitalContents.digital_content_id
        LEFT OUTER JOIN (
            SELECT
                plays.play_item_id as play_item_id,
                count(plays.id) as count
            FROM
                plays
            WHERE
                plays.created_at > (now() - interval '1 year')
            GROUP BY plays.play_item_id
        ) as year_listen_counts ON year_listen_counts.play_item_id = digitalContents.digital_content_id
        WHERE
            digitalContents.is_current is True AND
            digitalContents.is_delete is False AND
            digitalContents.is_unlisted is False AND
            digitalContents.stem_of is Null;

        CREATE INDEX interval_play_digital_content_id_idx ON aggregate_interval_plays (digital_content_id);
        CREATE INDEX interval_play_week_count_idx ON aggregate_interval_plays (week_listen_counts);
        CREATE INDEX interval_play_month_count_idx ON aggregate_interval_plays (month_listen_counts);
        CREATE INDEX interval_play_year_count_idx ON aggregate_interval_plays (year_listen_counts);

      --- 

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
                        users.cover_photo is not null AND
                        users.profile_picture is not null AND
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

    """
    )

    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table(
        "digital_content_trending_scores",
        sa.Column("digital_content_id", sa.Integer(), nullable=False, index=True),
        sa.Column("type", sa.String(), index=True),
        sa.Column("genre", sa.String(), index=True),
        sa.Column("version", sa.String(), nullable=False),
        sa.Column("time_range", sa.String(), nullable=True),
        sa.Column("score", sa.Float(), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.PrimaryKeyConstraint("digital_content_id", "type", "version", "time_range"),
    )


def downgrade():
    connection = op.get_bind()
    connection.execute(
        """
        DROP INDEX IF EXISTS interval_play_digital_content_id_idx;
        DROP MATERIALIZED VIEW aggregate_interval_plays;

        DROP INDEX IF EXISTS trending_params_digital_content_id_idx;
        DROP MATERIALIZED VIEW trending_params;

    """
    )
    op.drop_table("digital_content_trending_scores")
