create or replace function handle_content_list() returns trigger as $$
declare
  old_row contentLists%rowtype;
  delta int := 0;
begin

  insert into aggregate_content_list (content_list_id, is_album) values (new.content_list_id, new.is_album) on conflict do nothing;

  -- for extra safety ensure agg_user
  -- this should just happen in handle_user
  insert into aggregate_user (user_id) values (new.content_list_owner_id) on conflict do nothing;

  select * into old_row from contentLists where is_current = false and content_list_id = new.content_list_id order by blocknumber desc limit 1;

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
      where user_id = new.content_list_owner_id;
    else
      update aggregate_user 
      set content_list_count = content_list_count + delta
      where user_id = new.content_list_owner_id;
    end if;
  end if;


  return null;
end;
$$ language plpgsql;


drop trigger if exists on_content_list on contentLists;
create trigger on_content_list
  after insert on contentLists
  for each row execute procedure handle_content_list();