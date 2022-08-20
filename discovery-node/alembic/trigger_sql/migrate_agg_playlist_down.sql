
do $$ begin
  drop table if exists aggregate_content list cascade;
exception
  when others then null;
end $$;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.aggregate_content list AS
 SELECT p.content list_id,
    p.is_album,
    COALESCE(content list_repost.repost_count, (0)::bigint) AS repost_count,
    COALESCE(content list_save.save_count, (0)::bigint) AS save_count
   FROM ((public.content lists p
     LEFT JOIN ( SELECT r.repost_item_id AS content list_id,
            count(r.repost_item_id) AS repost_count
           FROM public.reposts r
          WHERE ((r.is_current IS TRUE) AND ((r.repost_type = 'content list'::public.reposttype) OR (r.repost_type = 'album'::public.reposttype)) AND (r.is_delete IS FALSE))
          GROUP BY r.repost_item_id) content list_repost ON ((content list_repost.content list_id = p.content list_id)))
     LEFT JOIN ( SELECT s.save_item_id AS content list_id,
            count(s.save_item_id) AS save_count
           FROM public.saves s
          WHERE ((s.is_current IS TRUE) AND ((s.save_type = 'content list'::public.savetype) OR (s.save_type = 'album'::public.savetype)) AND (s.is_delete IS FALSE))
          GROUP BY s.save_item_id) content list_save ON ((content list_save.content list_id = p.content list_id)))
  WHERE ((p.is_current IS TRUE) AND (p.is_delete IS FALSE))
  WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS  aggregate_content list_idx ON public.aggregate_content list USING btree (content list_id);