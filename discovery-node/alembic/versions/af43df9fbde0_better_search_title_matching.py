"""Better search title matching

Revision ID: af43df9fbde0
Revises: 90021fba7f4a
Create Date: 2021-04-29 19:19:04.686250

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "af43df9fbde0"
down_revision = "90021fba7f4a"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    connection.execute(
        """

    DROP MATERIALIZED VIEW IF EXISTS user_lexeme_dict;
    DROP INDEX IF EXISTS user_words_idx;

    CREATE MATERIALIZED VIEW user_lexeme_dict as
    SELECT row_number() OVER (PARTITION BY true), * FROM (
        SELECT
            u.user_id,
            lower(u.name) as user_name,
            lower(u.handle) as handle,
            a.follower_count as follower_count,
            unnest(
                tsvector_to_array(
                    to_tsvector(
                        'coliving_ts_config',
                        replace(COALESCE(u.name, ''), '&', 'and')
                    ) ||
                    to_tsvector(
                        'coliving_ts_config',
                        COALESCE(u.handle, '')
                    ) 
                ) || lower(COALESCE(u.name, ''))
            ) as word
        FROM
            users u
        INNER JOIN aggregate_user a on a.user_id = u.user_id
        WHERE u.is_current = true and 
        u.user_id not in (
			select u.user_id from users u
			inner join
				(
					select distinct lower(u1.handle) as handle, u1.user_id from users u1
					where u1.is_current = true and u1.is_verified = true
				) as sq
			on lower(u.name) = sq.handle and u.user_id != sq.user_id
			where u.is_current = true
		)
        GROUP BY u.user_id, u.name, u.handle, a.follower_count
    ) AS words;

    CREATE INDEX user_words_idx ON user_lexeme_dict USING gin(word gin_trgm_ops);
    CREATE INDEX user_handles_idx ON user_lexeme_dict(handle); 
    CREATE UNIQUE INDEX user_row_number_idx ON user_lexeme_dict(row_number);

    DROP MATERIALIZED VIEW IF EXISTS digital_content_lexeme_dict;
    DROP INDEX IF EXISTS digital_content_words_idx;

    CREATE MATERIALIZED VIEW digital_content_lexeme_dict as
    SELECT row_number() OVER (PARTITION BY true), * FROM (
        SELECT
            t.digital_content_id,
            t.owner_id as owner_id,
            lower(t.title) as digital_content_title,
            lower(u.handle) as handle,
            lower(u.name) as user_name,
            a.repost_count as repost_count,
            unnest(
                tsvector_to_array(
                    to_tsvector(
                        'coliving_ts_config',
                        replace(COALESCE(t."title", ''), '&', 'and')
                    )
                ) || lower(COALESCE(t."title", ''))
            ) as word
        FROM
            agreements t
        INNER JOIN users u ON t.owner_id = u.user_id
        INNER JOIN aggregate_digital_content a on a.digital_content_id = t.digital_content_id
        WHERE t.is_current = true AND t.is_unlisted = false AND t.is_delete = false AND t.stem_of IS NULL AND u.is_current = true and
        u.user_id not in (
			select u.user_id from users u
			inner join
				(
					select distinct lower(u1.handle) as handle, u1.user_id from users u1
					where u1.is_current = true and u1.is_verified = true
				) as sq
			on lower(u.name) = sq.handle and u.user_id != sq.user_id
			where u.is_current = true
		)
        GROUP BY t.digital_content_id, t.title, t.owner_id, u.handle, u.name, a.repost_count
    ) AS words;

    CREATE INDEX digital_content_words_idx ON digital_content_lexeme_dict USING gin(word gin_trgm_ops);
    CREATE INDEX digital_content_user_name_idx ON digital_content_lexeme_dict USING gin(user_name gin_trgm_ops);
    CREATE INDEX agreements_user_handle_idx ON digital_content_lexeme_dict(handle);
    CREATE UNIQUE INDEX digital_content_row_number_idx ON digital_content_lexeme_dict(row_number);

    DROP MATERIALIZED VIEW IF EXISTS content_list_lexeme_dict;
    DROP MATERIALIZED VIEW IF EXISTS album_lexeme_dict;
    DROP INDEX IF EXISTS content_list_words_idx;
    DROP INDEX IF EXISTS album_words_idx;

    CREATE MATERIALIZED VIEW content_list_lexeme_dict as
    SELECT row_number() OVER (PARTITION BY true), * FROM (
        SELECT
            p.content_list_id,
            lower(p.content_list_name) as content_list_name,
            p.content_list_owner_id as owner_id,
            lower(u.handle) as handle,
            lower(u.name) as user_name,
            a.repost_count as repost_count,
            unnest(
                tsvector_to_array(
                    to_tsvector(
                        'coliving_ts_config',
                        replace(COALESCE(p.content_list_name, ''), '&', 'and')
                    )
                ) || lower(COALESCE(p.content_list_name, ''))
            ) as word
        FROM
                contentLists p
        INNER JOIN users u ON p.content_list_owner_id = u.user_id
        INNER JOIN aggregate_content_list a on a.content_list_id = p.content_list_id
        WHERE
                p.is_current = true and p.is_album = false and p.is_private = false and p.is_delete = false
                and u.is_current = true and 
                u.user_id not in (
                    select u.user_id from users u
                    inner join
                        (
                            select distinct lower(u1.handle) as handle, u1.user_id from users u1
                            where u1.is_current = true and u1.is_verified = true
                        ) as sq
                    on lower(u.name) = sq.handle and u.user_id != sq.user_id
                    where u.is_current = true
                )
        GROUP BY p.content_list_id, p.content_list_name, p.content_list_owner_id, u.handle, u.name, a.repost_count
    ) AS words;

    CREATE MATERIALIZED VIEW album_lexeme_dict as
    SELECT row_number() OVER (PARTITION BY true), * FROM (
        SELECT
            p.content_list_id,
            lower(p.content_list_name) as content_list_name,
            p.content_list_owner_id as owner_id,
            lower(u.handle) as handle,
            lower(u.name) as user_name,
            a.repost_count as repost_count,
            unnest(
                tsvector_to_array(
                    to_tsvector(
                        'coliving_ts_config',
                        replace(COALESCE(p.content_list_name, ''), '&', 'and')
                    )
                ) || lower(COALESCE(p.content_list_name, ''))
            ) as word
        FROM
                contentLists p
        INNER JOIN users u ON p.content_list_owner_id = u.user_id
        INNER JOIN aggregate_content_list a on a.content_list_id = p.content_list_id
        WHERE
                p.is_current = true and p.is_album = true and p.is_private = false and p.is_delete = false
                and u.is_current = true and
                u.user_id not in (
                    select u.user_id from users u
                    inner join
                        (
                            select distinct lower(u1.handle) as handle, u1.user_id from users u1
                            where u1.is_current = true and u1.is_verified = true
                        ) as sq
                    on lower(u.name) = sq.handle and u.user_id != sq.user_id
                    where u.is_current = true
                )
        GROUP BY p.content_list_id, p.content_list_name, p.content_list_owner_id, u.handle, u.name, a.repost_count
    ) AS words;

    CREATE INDEX content_list_words_idx ON content_list_lexeme_dict USING gin(word gin_trgm_ops);
    CREATE INDEX content_list_user_name_idx ON content_list_lexeme_dict USING gin(user_name gin_trgm_ops);
    CREATE INDEX content_list_user_handle_idx ON content_list_lexeme_dict(handle);
    CREATE UNIQUE INDEX content_list_row_number_idx ON content_list_lexeme_dict(row_number);

    CREATE INDEX album_words_idx ON album_lexeme_dict USING gin(word gin_trgm_ops);
    CREATE INDEX album_user_name_idx ON album_lexeme_dict USING gin(user_name gin_trgm_ops);
    CREATE INDEX album_user_handle_idx ON album_lexeme_dict(handle);
    CREATE UNIQUE INDEX album_row_number_idx ON album_lexeme_dict(row_number);
    """
    )


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    pass
    # ### end Alembic commands ###
