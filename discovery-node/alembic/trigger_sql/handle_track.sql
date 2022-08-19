create or replace function handle_agreement() returns trigger as $$
declare
  old_row agreements%ROWTYPE;
  new_val int;
  delta int := 0;
begin
  -- ensure agg_agreement
  -- this could be the only place we do this one:
  insert into aggregate_agreement (agreement_id) values (new.agreement_id) on conflict do nothing;

  -- for extra safety ensure agg_user
  -- this should just happen in handle_user
  insert into aggregate_user (user_id) values (new.owner_id) on conflict do nothing;

  -- if it's a new agreement increment agg user agreement_count
  -- assert new.is_current = true; -- not actually true in tests
  select * into old_row from agreements where is_current = false and agreement_id = new.agreement_id order by blocknumber desc limit 1;

  -- agreement becomes invisible (one way change)
  if old_row.is_delete != new.is_delete or old_row.is_unlisted != new.is_unlisted then
    delta := -1;
  end if;

  if old_row is null and new.is_delete = false and new.is_unlisted = false and new.stem_of is null then
    delta := 1;
  end if;

  if delta != 0 then
    update aggregate_user 
    set agreement_count = agreement_count + delta
    where user_id = new.owner_id
    returning agreement_count into new_val;

    -- if delta = 1 and new_val = 3 then
    --   raise notice 'could create rewards row for: user agreement_count = 3';
    -- end if;
  end if;

  return null;
end;
$$ language plpgsql;



drop trigger if exists on_agreement on agreements;
create trigger on_agreement
  after insert on agreements
  for each row execute procedure handle_agreement();