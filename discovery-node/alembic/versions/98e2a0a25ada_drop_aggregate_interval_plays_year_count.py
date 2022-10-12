"""drop aggregate_interval_plays year count

Revision ID: 98e2a0a25ada
Revises: dc7f691adc79
Create Date: 2022-01-20 20:32:50.898715

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "98e2a0a25ada"
down_revision = "dc7f691adc79"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    connection.execute(
        """
        DROP MATERIALIZED VIEW IF EXISTS aggregate_interval_plays;

        -- same query as 92571f94989a but without year count
        CREATE MATERIALIZED VIEW IF NOT EXISTS aggregate_interval_plays as
        SELECT
            agreements.digital_content_id as digital_content_id,
            agreements.genre as genre,
            agreements.created_at as created_at,
            COALESCE (week_listen_counts.count, 0) as week_listen_counts,
            COALESCE (month_listen_counts.count, 0) as month_listen_counts
        FROM
            agreements
        LEFT OUTER JOIN (
            SELECT
                plays.play_item_id as play_item_id,
                count(plays.id) as count
            FROM
                plays
            WHERE
                plays.created_at > (now() - interval '1 week')
            GROUP BY plays.play_item_id
        ) as week_listen_counts ON week_listen_counts.play_item_id = agreements.digital_content_id
        LEFT OUTER JOIN (
            SELECT
                plays.play_item_id as play_item_id,
                count(plays.id) as count
            FROM
                plays
            WHERE
                plays.created_at > (now() - interval '1 month')
            GROUP BY plays.play_item_id
        ) as month_listen_counts ON month_listen_counts.play_item_id = agreements.digital_content_id
        WHERE
            agreements.is_current is True AND
            agreements.is_delete is False AND
            agreements.is_unlisted is False AND
            agreements.stem_of is Null;

        -- create primary key
        CREATE INDEX IF NOT EXISTS interval_play_digital_content_id_idx ON aggregate_interval_plays (digital_content_id);
        CREATE INDEX IF NOT EXISTS interval_play_week_count_idx ON aggregate_interval_plays (week_listen_counts);
        CREATE INDEX IF NOT EXISTS interval_play_month_count_idx ON aggregate_interval_plays (month_listen_counts);
    """
    )


def downgrade():
    connection = op.get_bind()
    connection.execute(
        """
        DROP MATERIALIZED VIEW IF EXISTS aggregate_interval_plays;

        CREATE MATERIALIZED VIEW IF NOT EXISTS aggregate_interval_plays as
        SELECT
            agreements.digital_content_id as digital_content_id,
            agreements.genre as genre,
            agreements.created_at as created_at,
            COALESCE (week_listen_counts.count, 0) as week_listen_counts,
            COALESCE (month_listen_counts.count, 0) as month_listen_counts,
            COALESCE (year_listen_counts.count, 0) as year_listen_counts
        FROM
            agreements
        LEFT OUTER JOIN (
            SELECT
                plays.play_item_id as play_item_id,
                count(plays.id) as count
            FROM
                plays
            WHERE
                plays.created_at > (now() - interval '1 week')
            GROUP BY plays.play_item_id
        ) as week_listen_counts ON week_listen_counts.play_item_id = agreements.digital_content_id
        LEFT OUTER JOIN (
            SELECT
                plays.play_item_id as play_item_id,
                count(plays.id) as count
            FROM
                plays
            WHERE
                plays.created_at > (now() - interval '1 month')
            GROUP BY plays.play_item_id
        ) as month_listen_counts ON month_listen_counts.play_item_id = agreements.digital_content_id
        LEFT OUTER JOIN (
            SELECT
                plays.play_item_id as play_item_id,
                count(plays.id) as count
            FROM
                plays
            WHERE
                plays.created_at > (now() - interval '1 year')
            GROUP BY plays.play_item_id
        ) as year_listen_counts ON year_listen_counts.play_item_id = agreements.digital_content_id
        WHERE
            agreements.is_current is True AND
            agreements.is_delete is False AND
            agreements.is_unlisted is False AND
            agreements.stem_of is Null;

        CREATE INDEX IF NOT EXISTS interval_play_digital_content_id_idx ON aggregate_interval_plays (digital_content_id);
        CREATE INDEX IF NOT EXISTS interval_play_week_count_idx ON aggregate_interval_plays (week_listen_counts);
        CREATE INDEX IF NOT EXISTS interval_play_month_count_idx ON aggregate_interval_plays (month_listen_counts);
        CREATE INDEX IF NOT EXISTS interval_play_year_count_idx ON aggregate_interval_plays (year_listen_counts);
    """
    )
