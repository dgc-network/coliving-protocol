"""Recreate digital_content_routes table

Revision ID: 534987cb0355
Revises: 6cf091d52869
Create Date: 2021-07-15 04:48:03.272800

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import sessionmaker


# revision identifiers, used by Alembic.
revision = "534987cb0355"
down_revision = "6cf091d52869"
branch_labels = None
depends_on = None

Session = sessionmaker()


def upgrade():
    bind = op.get_bind()
    session = Session(bind=bind)

    session.execute(sa.text("TRUNCATE TABLE digital_content_routes"))

    # Bring over existing routes (current agreements)
    session.execute(
        sa.text(
            """
            INSERT INTO digital_content_routes (
                digital_content_id
                , owner_id
                , slug
                , title_slug
                , collision_id
                , is_current
                , blockhash
                , blocknumber
                , txhash
            )
            SELECT
                digital_content_id
                , owner_id
                , CONCAT(SPLIT_PART(route_id, '/', 2),  '-', digital_content_id)
                    AS slug
                , CONCAT(SPLIT_PART(route_id, '/', 2),  '-', digital_content_id)
                    AS title_slug
                , 0 AS collision_id
                , is_current
                , blockhash
                , blocknumber
                ,txhash
            FROM agreements
            WHERE is_current
            GROUP BY
                owner_id
                , digital_content_id
                , route_id
                , is_current
                , blockhash
                , blocknumber
                , txhash;
            """
        )
    )

    # Bring over existing routes (non-current agreements)
    session.execute(
        sa.text(
            """
            INSERT INTO digital_content_routes (
                digital_content_id
                , owner_id
                , slug
                , title_slug
                , collision_id
                , is_current
                , blockhash
                , blocknumber
                , txhash
            )
            SELECT
                t.digital_content_id
                , t.owner_id
                , t.slug
                , t.title_slug
                , t.collision_id
                , t.is_current
                , t.blockhash
                , t.blocknumber
                , t.txhash
            FROM (
                SELECT
                    nc.digital_content_id
                    , nc.owner_id
                    , CONCAT(
                            SPLIT_PART(nc.route_id, '/', 2),
                            '-',
                            nc.digital_content_id
                        ) AS slug
                    , CONCAT(
                            SPLIT_PART(nc.route_id, '/', 2),
                            '-',
                            nc.digital_content_id
                        ) AS title_slug
                    , 0 AS collision_id
                    , nc.is_current
                    , nc.blockhash
                    , nc.blocknumber
                    , nc.txhash
                    , ROW_NUMBER() OVER (
                            PARTITION BY nc.route_id
                            ORDER BY nc.blocknumber DESC
                        ) AS rank
                FROM agreements AS c_digital_contents
                JOIN agreements AS nc
                ON c_digital_contents.digital_content_id = nc.digital_content_id
                WHERE NOT nc.is_current
                AND c_digital_contents.is_current
                AND NOT nc.route_id = c_digital_contents.route_id
            ) t
            WHERE t.rank = 1;
            """
        )
    )


def downgrade():
    pass
