
do $$ begin
  drop table if exists aggregate_content_list cascade;
exception
  when others then null;
end $$;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.aggregate_content_list AS
 SELECT p.content_list_id,
    p.is_album,
    COALESCE(content_list_repost.repost_count, (0)::bigint) AS repost_count,
    COALESCE(content_list_save.save_count, (0)::bigint) AS save_count
   FROM ((public.contentLists p
     LEFT JOIN ( SELECT r.repost_item_id AS content_list_id,
            count(r.repost_item_id) AS repost_count
           FROM public.reposts r
          WHERE ((r.is_current IS TRUE) AND ((r.repost_type = 'contentList'::public.reposttype) OR (r.repost_type = 'album'::public.reposttype)) AND (r.is_delete IS FALSE))
          GROUP BY r.repost_item_id) content_list_repost ON ((content_list_repost.content_list_id = p.content_list_id)))
     LEFT JOIN ( SELECT s.save_item_id AS content_list_id,
            count(s.save_item_id) AS save_count
           FROM public.saves s
          WHERE ((s.is_current IS TRUE) AND ((s.save_type = 'contentList'::public.savetype) OR (s.save_type = 'album'::public.savetype)) AND (s.is_delete IS FALSE))
          GROUP BY s.save_item_id) content_list_save ON ((content_list_save.content_list_id = p.content_list_id)))
  WHERE ((p.is_current IS TRUE) AND (p.is_delete IS FALSE))
  WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS  aggregate_content_list_idx ON public.aggregate_content_list USING btree (content_list_id);