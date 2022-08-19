"""Recreate agreement_routes table

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

    session.execute(sa.text("TRUNCATE TABLE agreement_routes"))

    # Bring over existing routes (current agreements)
    session.execute(
        sa.text(
            """
            INSERT INTO agreement_routes (
                agreement_id
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
                agreement_id
                , owner_id
                , CONCAT(SPLIT_PART(route_id, '/', 2),  '-', agreement_id)
                    AS slug
                , CONCAT(SPLIT_PART(route_id, '/', 2),  '-', agreement_id)
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
                , agreement_id
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
            INSERT INTO agreement_routes (
                agreement_id
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
                t.agreement_id
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
                    nc.agreement_id
                    , nc.owner_id
                    , CONCAT(
                            SPLIT_PART(nc.route_id, '/', 2),
                            '-',
                            nc.agreement_id
                        ) AS slug
                    , CONCAT(
                            SPLIT_PART(nc.route_id, '/', 2),
                            '-',
                            nc.agreement_id
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
                FROM agreements AS c_agreements
                JOIN agreements AS nc
                ON c_agreements.agreement_id = nc.agreement_id
                WHERE NOT nc.is_current
                AND c_agreements.is_current
                AND NOT nc.route_id = c_agreements.route_id
            ) t
            WHERE t.rank = 1;
            """
        )
    )


def downgrade():
    pass
