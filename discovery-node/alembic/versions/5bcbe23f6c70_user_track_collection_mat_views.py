"""user-agreement-collection-mat-views

Revision ID: 5bcbe23f6c70
Revises: 2ff46a8686fa
Create Date: 2021-04-12 20:01:40.395480

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "5bcbe23f6c70"
down_revision = "2ff46a8686fa"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    connection.execute(
        """
      begin;
        --- ======================= AGGREGATE USER =======================
        DROP MATERIALIZED VIEW IF EXISTS aggregate_user;
        DROP INDEX IF EXISTS aggregate_user_idx;

        CREATE MATERIALIZED VIEW aggregate_user as
        SELECT
            distinct(u.user_id),
            COALESCE (user_agreement.agreement_count, 0) as agreement_count,
            COALESCE (user_playlist.playlist_count, 0) as playlist_count,
            COALESCE (user_album.album_count, 0) as album_count,
            COALESCE (user_follower.follower_count, 0) as follower_count,
            COALESCE (user_followee.followee_count, 0) as following_count,
            COALESCE (user_repost.repost_count, 0) as repost_count,
            COALESCE (user_agreement_save.save_count, 0) as agreement_save_count
        FROM 
            users u
        -- join on subquery for agreements created
        LEFT OUTER JOIN (
            SELECT
                t.owner_id as owner_id,
                count(t.owner_id) as agreement_count
            FROM
                agreements t
            WHERE
                t.is_current is True AND
                t.is_delete is False AND
                t.is_unlisted is False AND
                t.stem_of is Null
            GROUP BY t.owner_id
        ) as user_agreement ON user_agreement.owner_id = u.user_id
        -- join on subquery for playlists created
        LEFT OUTER JOIN (
            SELECT
                p.playlist_owner_id as owner_id,
                count(p.playlist_owner_id) as playlist_count
            FROM
                playlists p
            WHERE
                p.is_album is False AND
                p.is_current is True AND
                p.is_delete is False AND
                p.is_private is False
            GROUP BY p.playlist_owner_id
        ) as user_playlist ON user_playlist.owner_id = u.user_id
        -- join on subquery for albums created
        LEFT OUTER JOIN (
            SELECT
                p.playlist_owner_id as owner_id,
                count(p.playlist_owner_id) as album_count
            FROM
                playlists p
            WHERE
                p.is_album is True AND
                p.is_current is True AND
                p.is_delete is False AND
                p.is_private is False
            GROUP BY p.playlist_owner_id
        ) user_album ON user_album.owner_id = u.user_id
        -- join on subquery for followers
        LEFT OUTER JOIN (
            SELECT
                f.followee_user_id as followee_user_id,
                count(f.followee_user_id) as follower_count
            FROM
                follows f
            WHERE
                f.is_current is True AND
                f.is_delete is False
            GROUP BY f.followee_user_id
        ) user_follower ON user_follower.followee_user_id = u.user_id
        -- join on subquery for followee
        LEFT OUTER JOIN (
            SELECT
                f.follower_user_id as follower_user_id,
                count(f.follower_user_id) as followee_count
            FROM
                follows f
            WHERE
                f.is_current is True AND
                f.is_delete is False
            GROUP BY f.follower_user_id
        ) user_followee ON user_followee.follower_user_id = u.user_id
        -- join on subquery for reposts
        LEFT OUTER JOIN (
            SELECT
                r.user_id as user_id,
                count(r.user_id) as repost_count
            FROM
                reposts r
            WHERE
                r.is_current is True AND
                r.is_delete is False
            GROUP BY r.user_id
        ) user_repost ON user_repost.user_id = u.user_id
        -- join on subquery for agreement saves
        LEFT OUTER JOIN (
            SELECT
                s.user_id as user_id,
                count(s.user_id) as save_count
            FROM
                saves s
            WHERE
                s.is_current is True AND
                s.save_type = 'agreement' AND
                s.is_delete is False
            GROUP BY s.user_id
        ) user_agreement_save ON user_agreement_save.user_id = u.user_id
        WHERE
            u.is_current is True;

        CREATE UNIQUE INDEX aggregate_user_idx ON aggregate_user (user_id);    

        --- ======================= AGGREGATE AGREEMENT =======================
        DROP MATERIALIZED VIEW IF EXISTS aggregate_agreement;
        DROP INDEX IF EXISTS aggregate_agreement_idx;

        CREATE MATERIALIZED VIEW aggregate_agreement as
        SELECT
          t.agreement_id,
          COALESCE (agreement_repost.repost_count, 0) as repost_count,
          COALESCE (agreement_save.save_count, 0) as save_count
        FROM 
          agreements t
        -- inner join on subquery for reposts
        LEFT OUTER JOIN (
          SELECT
            r.repost_item_id as agreement_id,
            count(r.repost_item_id) as repost_count
          FROM
            reposts r
          WHERE
            r.is_current is True AND
            r.repost_type = 'agreement' AND
            r.is_delete is False
          GROUP BY r.repost_item_id
        ) agreement_repost ON agreement_repost.agreement_id = t.agreement_id
        -- inner join on subquery for agreement saves
        LEFT OUTER JOIN (
          SELECT
            s.save_item_id as agreement_id,
            count(s.save_item_id) as save_count
          FROM
            saves s
          WHERE
            s.is_current is True AND
            s.save_type = 'agreement' AND
            s.is_delete is False
          GROUP BY s.save_item_id
        ) agreement_save ON agreement_save.agreement_id = t.agreement_id
        WHERE
          t.is_current is True AND
          t.is_delete is False;

        CREATE UNIQUE INDEX aggregate_agreement_idx ON aggregate_agreement (agreement_id);

        --- ======================= AGGREGATE PLAYLIST =======================
        DROP MATERIALIZED VIEW IF EXISTS aggregate_playlist;
        DROP INDEX IF EXISTS aggregate_playlist_idx;

        CREATE MATERIALIZED VIEW aggregate_playlist as
        SELECT
          p.playlist_id,
          p.is_album,
          COALESCE (playlist_repost.repost_count, 0) as repost_count,
          COALESCE (playlist_save.save_count, 0) as save_count
        FROM 
          playlists p
        -- inner join on subquery for reposts
        LEFT OUTER JOIN (
          SELECT
            r.repost_item_id as playlist_id,
            count(r.repost_item_id) as repost_count
          FROM
            reposts r
          WHERE
            r.is_current is True AND
            (r.repost_type = 'playlist' OR r.repost_type = 'album') AND
            r.is_delete is False
          GROUP BY r.repost_item_id
        ) playlist_repost ON playlist_repost.playlist_id = p.playlist_id
        -- inner join on subquery for agreement saves
        LEFT OUTER JOIN (
          SELECT
            s.save_item_id as playlist_id,
            count(s.save_item_id) as save_count
          FROM
            saves s
          WHERE
            s.is_current is True AND
            (s.save_type = 'playlist' OR s.save_type = 'album') AND
            s.is_delete is False
          GROUP BY s.save_item_id
        ) playlist_save ON playlist_save.playlist_id = p.playlist_id
        WHERE
          p.is_current is True AND
          p.is_delete is False;

        CREATE UNIQUE INDEX aggregate_playlist_idx ON aggregate_playlist (playlist_id);
      commit;
    """
    )


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    # ### end Alembic commands ###
    connection = op.get_bind()
    connection.execute(
        """
      begin;
        DROP INDEX IF EXISTS aggregate_user_idx;
        DROP INDEX IF EXISTS aggregate_agreement_idx;
        DROP INDEX IF EXISTS aggregate_playlist_idx;
        DROP MATERIALIZED VIEW aggregate_user;
        DROP MATERIALIZED VIEW aggregate_agreement;
        DROP MATERIALIZED VIEW aggregate_playlist;
      commit;
    """
    )
