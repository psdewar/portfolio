-- Run this in Supabase SQL Editor (after 008).
-- Manual-key relay destinations (Instagram, Facebook). RLS is enabled with no
-- policies, so only the service role can read or write.

create table if not exists social_destinations (
  platform text not null check (platform in ('instagram', 'facebook')),
  kind text not null check (kind in ('public', 'practice')),
  stream_url text not null,
  stream_key text not null,
  updated_at timestamptz not null default now(),
  primary key (platform, kind)
);

alter table social_destinations enable row level security;

insert into social_destinations (platform, kind, stream_url, stream_key, updated_at)
select 'instagram', kind, stream_url, stream_key, saved_at from instagram_destinations
on conflict (platform, kind) do nothing;
