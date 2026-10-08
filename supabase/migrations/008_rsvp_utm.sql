-- Run this in Supabase SQL Editor. Not applied automatically.
-- Campaign source on each RSVP (from the /rsvp landing URL's UTM tags).
alter table rsvps
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text;
