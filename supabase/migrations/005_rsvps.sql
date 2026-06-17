-- Run this in Supabase SQL Editor (after or alongside 004).
-- Normalized RSVP records: one row per person per show, with guest count + time.
-- Mirrors `attendances`; supersedes the `stay-connected.rsvp` array. Email-linked,
-- matching the rest of the schema (purchases/stay-connected use email, no FKs).

create table if not exists rsvps (
  id bigserial primary key,
  show_slug text not null,
  email text not null,
  guests int not null default 1,
  created_at timestamptz not null default now(),
  unique (show_slug, email)
);

create index if not exists rsvps_slug on rsvps (show_slug);
