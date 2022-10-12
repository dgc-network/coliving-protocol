create or replace function handle_digital_content() returns trigger as $$
declare
  old_row digitalContents%ROWTYPE;
  new_val int;
  delta int := 0;
begin
  -- ensure agg_digital_content
  -- this could be the only place we do this one:
  insert into aggregate_digital_content (digital_content_id) values (new.digital_content_id) on conflict do nothing;

  -- for extra safety ensure agg_user
  -- this should just happen in handle_user
  insert into aggregate_user (user_id) values (new.owner_id) on conflict do nothing;

  -- if it's a new digital_content increment agg user digital_content_count
  -- assert new.is_current = true; -- not actually true in tests
  select * into old_row from digitalContents where is_current = false and digital_content_id = new.digital_content_id order by blocknumber desc limit 1;

  -- digital_content becomes invisible (one way change)
  if old_row.is_delete != new.is_delete or old_row.is_unlisted != new.is_unlisted then
    delta := -1;
  end if;

  if old_row is null and new.is_delete = false and new.is_unlisted = false and new.stem_of is null then
    delta := 1;
  end if;

  if delta != 0 then
    update aggregate_user 
    set digital_content_count = digital_content_count + delta
    where user_id = new.owner_id
    returning digital_content_count into new_val;

    -- if delta = 1 and new_val = 3 then
    --   raise notice 'could create rewards row for: user digital_content_count = 3';
    -- end if;
  end if;

  return null;
end;
$$ language plpgsql;



drop trigger if exists on_digital_content on digitalContents;
create trigger on_digital_content
  after insert on digitalContents
  for each row execute procedure handle_digital_content();