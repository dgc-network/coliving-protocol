
alter table aggregate_digital_content alter column repost_count set default 0;
alter table aggregate_digital_content alter column save_count set default 0;


WITH 
aggregate_digital_content_latest_blocknumber AS (
  select last_checkpoint as blocknumber from indexing_checkpoints where tablename = 'aggregate_digital_content'
),
new_digital_content AS (
    SELECT
        t.digital_content_id AS digital_content_id
    FROM
        digitalContents t
    WHERE
        t.is_current IS TRUE
        AND t.is_delete IS FALSE
        AND t.blocknumber > (select blocknumber from aggregate_digital_content_latest_blocknumber)
    GROUP BY
        t.digital_content_id
    UNION
    ALL (
        SELECT
            r.repost_item_id AS digital_content_id
        FROM
            reposts r
        WHERE
            r.is_current IS TRUE
            AND r.repost_type = 'digital_content'
            AND r.blocknumber > (select blocknumber from aggregate_digital_content_latest_blocknumber)
        GROUP BY
            r.repost_item_id
    )
    UNION
    ALL (
        SELECT
            s.save_item_id AS digital_content_id
        FROM
            saves s
        WHERE
            s.is_current IS TRUE
            AND s.save_type = 'digital_content'
            AND s.blocknumber > (select blocknumber from aggregate_digital_content_latest_blocknumber)
        GROUP BY
            s.save_item_id
    )
),
deleted_digital_contents AS (
    DELETE FROM
        aggregate_digital_content a
    WHERE
        a.digital_content_id IN (
            SELECT
                digital_content_id
            FROM
                digitalContents d
            WHERE
                d.is_current IS TRUE
                AND d.is_delete IS TRUE
                AND d.blocknumber > (select blocknumber from aggregate_digital_content_latest_blocknumber)
        )
)
INSERT INTO
    aggregate_digital_content (digital_content_id, repost_count, save_count)
SELECT
    DISTINCT(t.digital_content_id),
    COALESCE(digital_content_repost.repost_count, 0) AS repost_count,
    COALESCE(digital_content_save.save_count, 0) AS save_count
FROM
    digitalContents t
    LEFT OUTER JOIN (
        SELECT
            r.repost_item_id AS digital_content_id,
            count(r.repost_item_id) AS repost_count
        FROM
            reposts r
        WHERE
            r.is_current IS TRUE
            AND r.repost_type = 'digital_content'
            AND r.is_delete IS FALSE
            AND r.repost_item_id IN (
                SELECT
                    digital_content_id
                FROM
                    new_digital_content
            )
        GROUP BY
            r.repost_item_id
    ) AS digital_content_repost ON digital_content_repost.digital_content_id = t.digital_content_id
    LEFT OUTER JOIN (
        SELECT
            s.save_item_id AS digital_content_id,
            count(s.save_item_id) AS save_count
        FROM
            saves s
        WHERE
            s.is_current IS TRUE
            AND s.save_type = 'digital_content'
            AND s.is_delete IS FALSE
            AND s.save_item_id IN (
                SELECT
                    digital_content_id
                FROM
                    new_digital_content
            )
        GROUP BY
            s.save_item_id
    ) AS digital_content_save ON digital_content_save.digital_content_id = t.digital_content_id
WHERE
    t.is_current is TRUE
    AND t.is_delete IS FALSE
    AND t.digital_content_id in (
        SELECT
            digital_content_id
        FROM
            new_digital_content
    ) ON CONFLICT (digital_content_id) DO
UPDATE
SET
    repost_count = EXCLUDED.repost_count,
    save_count = EXCLUDED.save_count
;