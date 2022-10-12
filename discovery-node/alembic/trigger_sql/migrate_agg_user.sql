alter table aggregate_user alter column digital_content_count set default 0;
alter table aggregate_user alter column content_list_count set default 0;
alter table aggregate_user alter column album_count set default 0;
alter table aggregate_user alter column follower_count set default 0;
alter table aggregate_user alter column following_count set default 0;
alter table aggregate_user alter column repost_count set default 0;
alter table aggregate_user alter column digital_content_save_count set default 0;


WITH aggregate_user_latest_blocknumber AS (
  select last_checkpoint as blocknumber from indexing_checkpoints where tablename = 'aggregate_user'
),
changed_users AS (
    SELECT
        user_id
    FROM
        users u
    WHERE
        u.is_current IS TRUE
        AND u.blocknumber > (
            SELECT
                blocknumber
            FROM
                aggregate_user_latest_blocknumber
        )
    GROUP BY
        user_id
    UNION
    ALL
    SELECT
        t.owner_id AS owner_id
    FROM
        agreements t
    WHERE
        t.is_current IS TRUE
        AND t.blocknumber > (
            SELECT
                blocknumber
            FROM
                aggregate_user_latest_blocknumber
        )
    GROUP BY
        t.owner_id
    UNION
    ALL
    SELECT
        p.content_list_owner_id AS owner_id
    FROM
        contentLists p
    WHERE
        p.is_current IS TRUE
        AND p.blocknumber > (
            SELECT
                blocknumber
            FROM
                aggregate_user_latest_blocknumber
        )
    GROUP BY
        p.content_list_owner_id
    UNION
    ALL (
        SELECT
            f.followee_user_id AS followee_user_id
        FROM
            follows f
        WHERE
            f.is_current IS TRUE
            AND f.blocknumber > (
                SELECT
                    blocknumber
                FROM
                    aggregate_user_latest_blocknumber
            )
        GROUP BY
            f.followee_user_id
    )
    UNION
    ALL (
        SELECT
            f.follower_user_id AS follower_user_id
        FROM
            follows f
        WHERE
            f.is_current IS TRUE
            AND f.blocknumber > (
                SELECT
                    blocknumber
                from
                    aggregate_user_latest_blocknumber
            )
        GROUP BY
            f.follower_user_id
    )
    UNION
    ALL (
        SELECT
            r.user_id AS user_id
        FROM
            reposts r
        WHERE
            r.is_current IS TRUE
            AND r.blocknumber > (
                SELECT
                    blocknumber
                from
                    aggregate_user_latest_blocknumber
            )
        GROUP BY
            r.user_id
    )
    UNION
    ALL (
        SELECT
            s.user_id AS user_id
        FROM
            saves s
        WHERE
            s.is_current IS TRUE
            AND s.save_type = 'digital_content'
            AND s.blocknumber > (
                SELECT
                    blocknumber
                FROM
                    aggregate_user_latest_blocknumber
            )
        GROUP BY
            s.user_id
    )
)
INSERT INTO
    aggregate_user (
        user_id,
        digital_content_count,
        content_list_count,
        album_count,
        follower_count,
        following_count,
        repost_count,
        digital_content_save_count
    )
SELECT
    DISTINCT(u.user_id),
    COALESCE (user_digital_content.digital_content_count, 0) AS digital_content_count,
    COALESCE (user_content_list.content_list_count, 0) AS content_list_count,
    COALESCE (user_album.album_count, 0) AS album_count,
    COALESCE (user_follower.follower_count, 0) AS follower_count,
    COALESCE (user_followee.followee_count, 0) AS following_count,
    COALESCE (user_repost.repost_count, 0) AS repost_count,
    COALESCE (user_digital_content_save.save_count, 0) AS digital_content_save_count
FROM
    users u
    LEFT OUTER JOIN (
        SELECT
            t.owner_id AS owner_id,
            count(t.owner_id) AS digital_content_count
        FROM
            agreements t
        WHERE
            t.is_current IS TRUE
            AND t.is_delete IS FALSE
            AND t.is_unlisted IS FALSE
            AND t.stem_of IS NULL
            AND t.owner_id IN (
                select
                    user_id
                from
                    changed_users
            )
        GROUP BY
            t.owner_id
    ) as user_digital_content ON user_digital_content.owner_id = u.user_id
    LEFT OUTER JOIN (
        SELECT
            p.content_list_owner_id AS owner_id,
            count(p.content_list_owner_id) AS content_list_count
        FROM
            contentLists p
        WHERE
            p.is_album IS FALSE
            AND p.is_current IS TRUE
            AND p.is_delete IS FALSE
            AND p.is_private IS FALSE
            AND p.content_list_owner_id IN (
                select
                    user_id
                from
                    changed_users
            )
        GROUP BY
            p.content_list_owner_id
    ) AS user_content_list ON user_content_list.owner_id = u.user_id
    LEFT OUTER JOIN (
        SELECT
            p.content_list_owner_id AS owner_id,
            count(p.content_list_owner_id) AS album_count
        FROM
            contentLists p
        WHERE
            p.is_album IS TRUE
            AND p.is_current IS TRUE
            AND p.is_delete IS FALSE
            AND p.is_private IS FALSE
            AND p.content_list_owner_id IN (
                SELECT
                    user_id
                FROM
                    changed_users
            )
        GROUP BY
            p.content_list_owner_id
    ) user_album ON user_album.owner_id = u.user_id
    LEFT OUTER JOIN (
        SELECT
            f.followee_user_id AS followee_user_id,
            count(f.followee_user_id) AS follower_count
        FROM
            follows f
        WHERE
            f.is_current IS TRUE
            AND f.is_delete IS FALSE
            AND f.followee_user_id IN ( -- to calculate follower count for changed users, changed user id must match followee user id
                SELECT
                    user_id
                FROM
                    changed_users
            )
        GROUP BY
            f.followee_user_id
    ) user_follower ON user_follower.followee_user_id = u.user_id
    LEFT OUTER JOIN (
        SELECT
            f.follower_user_id AS follower_user_id,
            count(f.follower_user_id) AS followee_count
        FROM
            follows f
        WHERE
            f.is_current IS TRUE
            AND f.is_delete IS FALSE
            AND f.follower_user_id IN (
                SELECT
                    user_id
                FROM
                    changed_users
            )
        GROUP BY
            f.follower_user_id
    ) user_followee ON user_followee.follower_user_id = u.user_id
    LEFT OUTER JOIN (
        SELECT
            r.user_id AS user_id,
            count(r.user_id) AS repost_count
        FROM
            reposts r
        WHERE
            r.is_current IS TRUE
            AND r.is_delete IS FALSE
            AND r.user_id IN (
                SELECT
                    user_id
                from
                    changed_users
            )
        GROUP BY
            r.user_id
    ) user_repost ON user_repost.user_id = u.user_id
    LEFT OUTER JOIN (
        SELECT
            s.user_id AS user_id,
            count(s.user_id) AS save_count
        FROM
            saves s
        WHERE
            s.is_current IS TRUE
            AND s.save_type = 'digital_content'
            AND s.is_delete IS FALSE
            AND s.user_id IN (
                select
                    user_id
                from
                    changed_users
            )
        GROUP BY
            s.user_id
    ) user_digital_content_save ON user_digital_content_save.user_id = u.user_id
WHERE
    u.is_current IS TRUE
    AND u.user_id in (
        SELECT
            user_id
        FROM
            changed_users
    ) ON CONFLICT (user_id) DO
UPDATE
SET
    digital_content_count = EXCLUDED.digital_content_count,
    content_list_count = EXCLUDED.content_list_count,
    album_count = EXCLUDED.album_count,
    follower_count = EXCLUDED.follower_count,
    following_count = EXCLUDED.following_count,
    repost_count = EXCLUDED.repost_count,
    digital_content_save_count = EXCLUDED.digital_content_save_count
;