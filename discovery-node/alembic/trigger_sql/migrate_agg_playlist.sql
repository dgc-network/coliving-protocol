-- nice:
-- https://www.postgresql.org/docs/current/sql-do.html
do $$ begin
  drop materialized view if exists aggregate_content list cascade;
exception
  when others then null;
end $$;

create table if not exists aggregate_content list (
  content list_id integer primary key,
  is_album boolean,
  repost_count integer default 0,
  save_count integer default 0
);

insert into aggregate_content list
select
  content list_id,
  is_album,
  (
    select count(*) from reposts
    where 
      is_current = true
      and is_delete = false
      and (repost_type = 'content list' or repost_type = 'album')
      and repost_item_id = content list_id
  ) as repost_count,
  (
    select count(*) from saves
    where 
      is_current = true
      and is_delete = false
      and (save_type = 'content list' or save_type = 'album')
      and save_item_id = content list_id
  ) as save_count
from
  content lists
where
  is_current = true
  and is_delete = false
on conflict(content list_id) do update set 
  repost_count = excluded.repost_count,
  save_count = excluded.save_count;



