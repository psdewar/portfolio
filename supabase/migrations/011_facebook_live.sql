-- Run this in Supabase SQL Editor (after 010).
-- Facebook Live Video API: one long-lived user token and the current live
-- video per audience. RLS is enabled with no policies, so only the service
-- role can read or write.

create table if not exists facebook_account (
  id int primary key default 1 check (id = 1),
  access_token text not null,
  user_name text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table facebook_account enable row level security;

create table if not exists facebook_live_videos (
  kind text primary key check (kind in ('public', 'practice')),
  live_video_id text not null,
  stream_url text not null,
  updated_at timestamptz not null default now()
);

alter table facebook_live_videos enable row level security;
