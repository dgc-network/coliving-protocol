
do $$ begin
  drop table if exists aggregate_contentList cascade;
exception
  when others then null;
end $$;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.aggregate_contentList AS
 SELECT p.contentList_id,
    p.is_album,
    COALESCE(contentList_repost.repost_count, (0)::bigint) AS repost_count,
    COALESCE(contentList_save.save_count, (0)::bigint) AS save_count
   FROM ((public.contentLists p
     LEFT JOIN ( SELECT r.repost_item_id AS contentList_id,
            count(r.repost_item_id) AS repost_count
           FROM public.reposts r
          WHERE ((r.is_current IS TRUE) AND ((r.repost_type = 'contentList'::public.reposttype) OR (r.repost_type = 'album'::public.reposttype)) AND (r.is_delete IS FALSE))
          GROUP BY r.repost_item_id) contentList_repost ON ((contentList_repost.contentList_id = p.contentList_id)))
     LEFT JOIN ( SELECT s.save_item_id AS contentList_id,
            count(s.save_item_id) AS save_count
           FROM public.saves s
          WHERE ((s.is_current IS TRUE) AND ((s.save_type = 'contentList'::public.savetype) OR (s.save_type = 'album'::public.savetype)) AND (s.is_delete IS FALSE))
          GROUP BY s.save_item_id) contentList_save ON ((contentList_save.contentList_id = p.contentList_id)))
  WHERE ((p.is_current IS TRUE) AND (p.is_delete IS FALSE))
  WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS  aggregate_contentList_idx ON public.aggregate_contentList USING btree (contentList_id);