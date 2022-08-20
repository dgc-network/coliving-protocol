-- recreate dropped search matviews



CREATE MATERIALIZED VIEW IF NOT EXISTS public.content list_lexeme_dict AS
 SELECT row_number() OVER (PARTITION BY true::boolean) AS row_number,
    words.content list_id,
    words.content list_name,
    words.owner_id,
    words.handle,
    words.user_name,
    words.repost_count,
    words.word
   FROM ( SELECT p.content list_id,
            lower((p.content list_name)::text) AS content list_name,
            p.content list_owner_id AS owner_id,
            lower((u.handle)::text) AS handle,
            lower(u.name) AS user_name,
            a.repost_count,
            unnest((tsvector_to_array(to_tsvector('public.coliving_ts_config'::regconfig, replace((COALESCE(p.content list_name, ''::character varying))::text, '&'::text, 'and'::text))) || lower((COALESCE(p.content list_name, ''::character varying))::text))) AS word
           FROM ((public.content lists p
             JOIN public.users u ON ((p.content list_owner_id = u.user_id)))
             JOIN public.aggregate_content list a ON ((a.content list_id = p.content list_id)))
          WHERE ((p.is_current = true) AND (p.is_album = false) AND (p.is_private = false) AND (p.is_delete = false) AND (u.is_current = true) AND (NOT (u.user_id IN ( SELECT u_1.user_id
                   FROM (public.users u_1
                     JOIN ( SELECT DISTINCT lower((u1.handle)::text) AS handle,
                            u1.user_id
                           FROM public.users u1
                          WHERE ((u1.is_current = true) AND (u1.is_verified = true))) sq ON (((lower(u_1.name) = sq.handle) AND (u_1.user_id <> sq.user_id))))
                  WHERE (u_1.is_current = true)))))
          GROUP BY p.content list_id, p.content list_name, p.content list_owner_id, u.handle, u.name, a.repost_count) words
  WITH NO DATA;


CREATE UNIQUE INDEX IF NOT EXISTS content list_row_number_idx ON public.content list_lexeme_dict USING btree (row_number);
CREATE INDEX IF NOT EXISTS content list_user_handle_idx ON public.content list_lexeme_dict USING btree (handle);
CREATE INDEX IF NOT EXISTS content list_user_name_idx ON public.content list_lexeme_dict USING gin (user_name public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS content list_words_idx ON public.content list_lexeme_dict USING gin (word public.gin_trgm_ops);




CREATE MATERIALIZED VIEW IF NOT EXISTS public.album_lexeme_dict AS
 SELECT row_number() OVER (PARTITION BY true::boolean) AS row_number,
    words.content list_id,
    words.content list_name,
    words.owner_id,
    words.handle,
    words.user_name,
    words.repost_count,
    words.word
   FROM ( SELECT p.content list_id,
            lower((p.content list_name)::text) AS content list_name,
            p.content list_owner_id AS owner_id,
            lower((u.handle)::text) AS handle,
            lower(u.name) AS user_name,
            a.repost_count,
            unnest((tsvector_to_array(to_tsvector('public.coliving_ts_config'::regconfig, replace((COALESCE(p.content list_name, ''::character varying))::text, '&'::text, 'and'::text))) || lower((COALESCE(p.content list_name, ''::character varying))::text))) AS word
           FROM ((public.content lists p
             JOIN public.users u ON ((p.content list_owner_id = u.user_id)))
             JOIN public.aggregate_content list a ON ((a.content list_id = p.content list_id)))
          WHERE ((p.is_current = true) AND (p.is_album = true) AND (p.is_private = false) AND (p.is_delete = false) AND (u.is_current = true) AND (NOT (u.user_id IN ( SELECT u_1.user_id
                   FROM (public.users u_1
                     JOIN ( SELECT DISTINCT lower((u1.handle)::text) AS handle,
                            u1.user_id
                           FROM public.users u1
                          WHERE ((u1.is_current = true) AND (u1.is_verified = true))) sq ON (((lower(u_1.name) = sq.handle) AND (u_1.user_id <> sq.user_id))))
                  WHERE (u_1.is_current = true)))))
          GROUP BY p.content list_id, p.content list_name, p.content list_owner_id, u.handle, u.name, a.repost_count) words
  WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS album_row_number_idx ON public.album_lexeme_dict USING btree (row_number);
CREATE INDEX IF NOT EXISTS album_user_handle_idx ON public.album_lexeme_dict USING btree (handle);
CREATE INDEX IF NOT EXISTS album_user_name_idx ON public.album_lexeme_dict USING gin (user_name public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS album_words_idx ON public.album_lexeme_dict USING gin (word public.gin_trgm_ops);
