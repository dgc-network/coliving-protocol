create or replace function handle_contentList() returns trigger as $$
declare
  old_row contentLists%rowtype;
  delta int := 0;
begin

  insert into aggregate_contentList (contentList_id, is_album) values (new.contentList_id, new.is_album) on conflict do nothing;

  -- for extra safety ensure agg_user
  -- this should just happen in handle_user
  insert into aggregate_user (user_id) values (new.contentList_owner_id) on conflict do nothing;

  select * into old_row from contentLists where is_current = false and contentList_id = new.contentList_id order by blocknumber desc limit 1;

  -- should decrement
  if old_row.is_delete != new.is_delete or old_row.is_private != new.is_private then
    delta := -1;
  end if;

  if old_row is null and new.is_delete = false and new.is_private = false then
    delta := 1;
  end if;

  if delta != 0 then
    if new.is_album then
      update aggregate_user 
      set album_count = album_count + delta
      where user_id = new.contentList_owner_id;
    else
      update aggregate_user 
      set contentList_count = contentList_count + delta
      where user_id = new.contentList_owner_id;
    end if;
  end if;


  return null;
end;
$$ language plpgsql;


drop trigger if exists on_contentList on contentLists;
create trigger on_contentList
  after insert on contentLists
  for each row execute procedure handle_contentList();