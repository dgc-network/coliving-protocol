"""user-digital-content-collection-mat-views

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
            COALESCE (user_digital_content.digital_content_count, 0) as digital_content_count,
            COALESCE (user_content_list.content_list_count, 0) as content_list_count,
            COALESCE (user_album.album_count, 0) as album_count,
            COALESCE (user_follower.follower_count, 0) as follower_count,
            COALESCE (user_followee.followee_count, 0) as following_count,
            COALESCE (user_repost.repost_count, 0) as repost_count,
            COALESCE (user_digital_content_save.save_count, 0) as digital_content_save_count
        FROM 
            users u
        -- join on subquery for digitalContents created
        LEFT OUTER JOIN (
            SELECT
                t.owner_id as owner_id,
                count(t.owner_id) as digital_content_count
            FROM
                digitalContents t
            WHERE
                t.is_current is True AND
                t.is_delete is False AND
                t.is_unlisted is False AND
                t.stem_of is Null
            GROUP BY t.owner_id
        ) as user_digital_content ON user_digital_content.owner_id = u.user_id
        -- join on subquery for contentLists created
        LEFT OUTER JOIN (
            SELECT
                p.content_list_owner_id as owner_id,
                count(p.content_list_owner_id) as content_list_count
            FROM
                contentLists p
            WHERE
                p.is_album is False AND
                p.is_current is True AND
                p.is_delete is False AND
                p.is_private is False
            GROUP BY p.content_list_owner_id
        ) as user_content_list ON user_content_list.owner_id = u.user_id
        -- join on subquery for albums created
        LEFT OUTER JOIN (
            SELECT
                p.content_list_owner_id as owner_id,
                count(p.content_list_owner_id) as album_count
            FROM
                contentLists p
            WHERE
                p.is_album is True AND
                p.is_current is True AND
                p.is_delete is False AND
                p.is_private is False
            GROUP BY p.content_list_owner_id
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
        -- join on subquery for digital_content saves
        LEFT OUTER JOIN (
            SELECT
                s.user_id as user_id,
                count(s.user_id) as save_count
            FROM
                saves s
            WHERE
                s.is_current is True AND
                s.save_type = 'digital_content' AND
                s.is_delete is False
            GROUP BY s.user_id
        ) user_digital_content_save ON user_digital_content_save.user_id = u.user_id
        WHERE
            u.is_current is True;

        CREATE UNIQUE INDEX aggregate_user_idx ON aggregate_user (user_id);    

        --- ======================= AGGREGATE DIGITAL_CONTENT =======================
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

        --- ======================= AGGREGATE CONTENT_LIST =======================
        DROP MATERIALIZED VIEW IF EXISTS aggregate_content_list;
        DROP INDEX IF EXISTS aggregate_content_list_idx;

        CREATE MATERIALIZED VIEW aggregate_content_list as
        SELECT
          p.content_list_id,
          p.is_album,
          COALESCE (content_list_repost.repost_count, 0) as repost_count,
          COALESCE (content_list_save.save_count, 0) as save_count
        FROM 
          contentLists p
        -- inner join on subquery for reposts
        LEFT OUTER JOIN (
          SELECT
            r.repost_item_id as content_list_id,
            count(r.repost_item_id) as repost_count
          FROM
            reposts r
          WHERE
            r.is_current is True AND
            (r.repost_type = 'contentList' OR r.repost_type = 'album') AND
            r.is_delete is False
          GROUP BY r.repost_item_id
        ) content_list_repost ON content_list_repost.content_list_id = p.content_list_id
        -- inner join on subquery for digital_content saves
        LEFT OUTER JOIN (
          SELECT
            s.save_item_id as content_list_id,
            count(s.save_item_id) as save_count
          FROM
            saves s
          WHERE
            s.is_current is True AND
            (s.save_type = 'contentList' OR s.save_type = 'album') AND
            s.is_delete is False
          GROUP BY s.save_item_id
        ) content_list_save ON content_list_save.content_list_id = p.content_list_id
        WHERE
          p.is_current is True AND
          p.is_delete is False;

        CREATE UNIQUE INDEX aggregate_content_list_idx ON aggregate_content_list (content_list_id);
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
        DROP INDEX IF EXISTS aggregate_digital_content_idx;
        DROP INDEX IF EXISTS aggregate_content_list_idx;
        DROP MATERIALIZED VIEW aggregate_user;
        DROP MATERIALIZED VIEW aggregate_digital_content;
        DROP MATERIALIZED VIEW aggregate_content_list;
      commit;
    """
    )
