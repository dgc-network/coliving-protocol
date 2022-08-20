create or replace function handle_content list() returns trigger as $$
declare
  old_row content lists%rowtype;
  delta int := 0;
begin

  insert into aggregate_content list (content list_id, is_album) values (new.content list_id, new.is_album) on conflict do nothing;

  -- for extra safety ensure agg_user
  -- this should just happen in handle_user
  insert into aggregate_user (user_id) values (new.content list_owner_id) on conflict do nothing;

  select * into old_row from content lists where is_current = false and content list_id = new.content list_id order by blocknumber desc limit 1;

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
      where user_id = new.content list_owner_id;
    else
      update aggregate_user 
      set content list_count = content list_count + delta
      where user_id = new.content list_owner_id;
    end if;
  end if;


  return null;
end;
$$ language plpgsql;


drop trigger if exists on_content list on content lists;
create trigger on_content list
  after insert on content lists
  for each row execute procedure handle_content list();