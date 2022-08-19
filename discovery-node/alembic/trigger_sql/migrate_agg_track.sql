
alter table aggregate_agreement alter column repost_count set default 0;
alter table aggregate_agreement alter column save_count set default 0;


WITH 
aggregate_agreement_latest_blocknumber AS (
  select last_checkpoint as blocknumber from indexing_checkpoints where tablename = 'aggregate_agreement'
),
new_agreement AS (
    SELECT
        t.agreement_id AS agreement_id
    FROM
        agreements t
    WHERE
        t.is_current IS TRUE
        AND t.is_delete IS FALSE
        AND t.blocknumber > (select blocknumber from aggregate_agreement_latest_blocknumber)
    GROUP BY
        t.agreement_id
    UNION
    ALL (
        SELECT
            r.repost_item_id AS agreement_id
        FROM
            reposts r
        WHERE
            r.is_current IS TRUE
            AND r.repost_type = 'agreement'
            AND r.blocknumber > (select blocknumber from aggregate_agreement_latest_blocknumber)
        GROUP BY
            r.repost_item_id
    )
    UNION
    ALL (
        SELECT
            s.save_item_id AS agreement_id
        FROM
            saves s
        WHERE
            s.is_current IS TRUE
            AND s.save_type = 'agreement'
            AND s.blocknumber > (select blocknumber from aggregate_agreement_latest_blocknumber)
        GROUP BY
            s.save_item_id
    )
),
deleted_agreements AS (
    DELETE FROM
        aggregate_agreement a
    WHERE
        a.agreement_id IN (
            SELECT
                agreement_id
            FROM
                agreements d
            WHERE
                d.is_current IS TRUE
                AND d.is_delete IS TRUE
                AND d.blocknumber > (select blocknumber from aggregate_agreement_latest_blocknumber)
        )
)
INSERT INTO
    aggregate_agreement (agreement_id, repost_count, save_count)
SELECT
    DISTINCT(t.agreement_id),
    COALESCE(agreement_repost.repost_count, 0) AS repost_count,
    COALESCE(agreement_save.save_count, 0) AS save_count
FROM
    agreements t
    LEFT OUTER JOIN (
        SELECT
            r.repost_item_id AS agreement_id,
            count(r.repost_item_id) AS repost_count
        FROM
            reposts r
        WHERE
            r.is_current IS TRUE
            AND r.repost_type = 'agreement'
            AND r.is_delete IS FALSE
            AND r.repost_item_id IN (
                SELECT
                    agreement_id
                FROM
                    new_agreement
            )
        GROUP BY
            r.repost_item_id
    ) AS agreement_repost ON agreement_repost.agreement_id = t.agreement_id
    LEFT OUTER JOIN (
        SELECT
            s.save_item_id AS agreement_id,
            count(s.save_item_id) AS save_count
        FROM
            saves s
        WHERE
            s.is_current IS TRUE
            AND s.save_type = 'agreement'
            AND s.is_delete IS FALSE
            AND s.save_item_id IN (
                SELECT
                    agreement_id
                FROM
                    new_agreement
            )
        GROUP BY
            s.save_item_id
    ) AS agreement_save ON agreement_save.agreement_id = t.agreement_id
WHERE
    t.is_current is TRUE
    AND t.is_delete IS FALSE
    AND t.agreement_id in (
        SELECT
            agreement_id
        FROM
            new_agreement
    ) ON CONFLICT (agreement_id) DO
UPDATE
SET
    repost_count = EXCLUDED.repost_count,
    save_count = EXCLUDED.save_count
;