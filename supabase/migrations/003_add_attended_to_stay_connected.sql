-- Run this in Supabase SQL Editor before the first paper-signup import.
-- Adds an append-only array of show slugs the contact attended in person.
-- Distinct from `rsvp` (the online promise); presence in `attended` is binary
-- per person per show.

alter table "stay-connected"
  add column if not exists attended text[] default '{}'::text[] not null;

-- GIN index makes `attended @> array['vancouver-bc-0']` fast for admin queries
-- like "everyone who came to X".
create index if not exists stay_connected_attended_idx
  on "stay-connected" using gin (attended);
