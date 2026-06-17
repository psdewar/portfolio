-- Run this in Supabase SQL Editor.
-- Normalized check-in records: one row per person per show, with a timestamp.
-- Supersedes counting attendees by scanning `stay-connected.attended` arrays.
--
-- The admission number is DERIVED from check-in order — no stored count, no race.
-- attend(slug, email) inserts idempotently and returns the person's 1-based rank
-- by (created_at, id), so:
--   * concurrent check-ins can't collide on a number (the insert is atomic and
--     id breaks any same-instant tie),
--   * a re-check-in (any device) returns the SAME number (the row, and thus its
--     rank, is stable),
--   * the order is reconstructable forever from created_at.

create table if not exists attendances (
  id bigserial primary key,
  show_slug text not null,
  email text not null,
  created_at timestamptz not null default now(),
  unique (show_slug, email)
);

create index if not exists attendances_slug_time on attendances (show_slug, created_at, id);

create or replace function attend(p_slug text, p_email text)
returns int
language plpgsql
as $$
declare
  v_email text := lower(trim(p_email));
  v_id bigint;
  v_created timestamptz;
  v_number int;
begin
  insert into attendances (show_slug, email)
  values (p_slug, v_email)
  on conflict (show_slug, email) do nothing;

  select id, created_at into v_id, v_created
  from attendances
  where show_slug = p_slug and email = v_email;

  select count(*) into v_number
  from attendances
  where show_slug = p_slug
    and (created_at, id) <= (v_created, v_id);

  return v_number;
end;
$$;
