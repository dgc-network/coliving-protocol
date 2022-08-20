"""Drop old trending challenges

Revision ID: 7104383ac0fe
Revises: f775fb87f5ff
Create Date: 2022-01-14 21:07:15.939210

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "7104383ac0fe"
down_revision = "f775fb87f5ff"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    connection.execute(
        """
        --- Drop user challenges
        delete from user_challenges
        where
            challenge_id = 'trending-agreement' or
            challenge_id = 'trending-contentList' or
            challenge_id = 'trending-underground-agreement';

        --- Drop challenges
        delete from challenges
        where
            id = 'trending-agreement' or
            id = 'trending-contentList' or
            id = 'trending-underground-agreement';

        --- Drop trending results
        delete from trending_results;
        """
    )


def downgrade():
    pass
