
create or replace function handle_repost() returns trigger as $$
declare
  new_val int;
  milestone_name text;
  milestone integer;
  delta int;
begin
  -- ensure agg rows present
  -- this can be removed if we do this elsewhere
  -- but is here now for safety
  insert into aggregate_user (user_id) values (new.user_id) on conflict do nothing;
  if new.repost_type = 'digital_content' then
    insert into aggregate_digital_content (digital_content_id) values (new.repost_item_id) on conflict do nothing;
  else
    insert into aggregate_content_list (content_list_id) values (new.repost_item_id) on conflict do nothing;
  end if;

  -- increment or decrement?
  if new.is_delete then
    delta := -1;
  else
    delta := 1;
  end if;

  -- update agg user
  update aggregate_user 
  set repost_count = repost_count + delta
  where user_id = new.user_id;

  -- update agg digital_content or contentList
  if new.repost_type = 'digital_content' then
    milestone_name := 'DIGITAL_CONTENT_REPOST_COUNT';
    update aggregate_digital_content 
    set repost_count = repost_count + delta
    where digital_content_id = new.repost_item_id
    returning repost_count into new_val;
  else
    milestone_name := 'CONTENT_LIST_REPOST_COUNT';
    update aggregate_content_list
    set repost_count = repost_count + delta
    where content_list_id = new.repost_item_id
    returning repost_count into new_val;
  end if;

  -- create a milestone if applicable
  select new_val into milestone where new_val in (10, 25, 50, 100, 250, 500, 1000, 5000, 10000, 20000, 50000, 100000, 1000000);
  if new.is_delete = false and milestone is not null then
    insert into milestones 
      (id, name, threshold, blocknumber, slot, timestamp)
    values
      (new.repost_item_id, milestone_name, milestone, new.blocknumber, new.slot, new.created_at)
    on conflict do nothing;
  end if;

  return null;
end; 
$$ language plpgsql;


drop trigger if exists on_repost on reposts;
create trigger on_repost
  after insert on reposts
  for each row execute procedure handle_repost();