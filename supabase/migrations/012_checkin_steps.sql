-- Run this in Supabase SQL Editor. Not applied automatically.
-- Adds a public check-in id and per-step completion times to attendances.

alter table attendances
  add column if not exists public_id uuid not null default gen_random_uuid(),
  add column if not exists steps jsonb not null default '{}'::jsonb;

create unique index if not exists attendances_public_id_key on attendances (public_id);

create or replace function mark_checkin_step(p_id uuid, p_step text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if p_step not in ('save', 'tee', 'support', 'upload') then
    raise exception 'unknown step %', p_step;
  end if;
  update attendances
    set steps = steps || jsonb_build_object(p_step, coalesce(steps ->> p_step, now()::text))
    where public_id = p_id
    returning steps into result;
  return result;
end;
$$;

alter table attendances alter column email drop not null;

create or replace function skip_checkin(p_slug text, p_id uuid)
returns table (public_id uuid, number int, steps jsonb)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_row attendances%rowtype;
begin
  insert into attendances (show_slug, email, public_id) values (p_slug, null, p_id)
    on conflict (public_id) do nothing
    returning * into v_row;
  if not found then
    select * into v_row from attendances a where a.public_id = p_id and a.show_slug = p_slug;
    if not found then
      raise exception 'unknown check-in';
    end if;
  end if;
  return query
    select v_row.public_id,
      (select count(*)::int from attendances a
        where a.show_slug = p_slug and (a.created_at, a.id) <= (v_row.created_at, v_row.id)),
      v_row.steps;
end;
$$;

create or replace function claim_checkin(p_id uuid, p_slug text, p_email text)
returns table (public_id uuid, number int, steps jsonb)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_email text := lower(trim(p_email));
  v_anon attendances%rowtype;
  v_existing attendances%rowtype;
  v_final attendances%rowtype;
begin
  select * into v_anon from attendances a
    where a.public_id = p_id and a.email is null and a.show_slug = p_slug
    for update;
  if not found then
    select * into v_final from attendances a
      where a.public_id = p_id and a.show_slug = p_slug and a.email = v_email;
    if not found then
      raise exception 'unknown check-in';
    end if;
    return query
      select v_final.public_id,
        (select count(*)::int from attendances a
          where a.show_slug = v_final.show_slug and (a.created_at, a.id) <= (v_final.created_at, v_final.id)),
        v_final.steps;
    return;
  end if;

  select * into v_existing from attendances a
    where a.show_slug = v_anon.show_slug and a.email = v_email and a.id <> v_anon.id;

  if found then
    update attendances set steps = v_anon.steps || steps where id = v_existing.id
      returning * into v_final;
    delete from attendances where id = v_anon.id;
  else
    update attendances set email = v_email where id = v_anon.id returning * into v_final;
  end if;

  return query
    select v_final.public_id,
      (select count(*)::int from attendances a
        where a.show_slug = v_final.show_slug and (a.created_at, a.id) <= (v_final.created_at, v_final.id)),
      v_final.steps;
end;
$$;

revoke execute on function claim_checkin(uuid, text, text), skip_checkin(text, uuid), mark_checkin_step(uuid, text)
  from public, anon, authenticated;
grant execute on function claim_checkin(uuid, text, text), skip_checkin(text, uuid), mark_checkin_step(uuid, text)
  to service_role;
