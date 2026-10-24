-- Run this in Supabase SQL Editor. Not applied automatically.
-- Allows the follow check-in step.

create or replace function mark_checkin_step(p_id uuid, p_step text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if p_step not in ('save', 'tee', 'support', 'upload', 'monthly', 'follow') then
    raise exception 'unknown step %', p_step;
  end if;
  update attendances
    set steps = steps || jsonb_build_object(p_step, coalesce(steps ->> p_step, now()::text))
    where public_id = p_id
    returning steps into result;
  return result;
end;
$$;

revoke execute on function mark_checkin_step(uuid, text) from public, anon, authenticated;
grant execute on function mark_checkin_step(uuid, text) to service_role;
