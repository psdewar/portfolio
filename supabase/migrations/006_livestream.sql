-- Run this in Supabase SQL Editor (after 005).
-- Livestream relay config. Holds OAuth refresh tokens and stream keys:
-- RLS is enabled with no policies, so only the service role can read or write.

create table if not exists youtube_accounts (
  account text primary key check (account in ('main', 'practice')),
  refresh_token text not null,
  channel_title text not null,
  live_stream_id text,
  ingest_url text,
  stream_name text,
  current_broadcast_id text,
  updated_at timestamptz not null default now()
);

create table if not exists livestream_settings (
  id int primary key default 1 check (id = 1),
  title text not null default '',
  description text not null default '',
  privacy text not null default 'public' check (privacy in ('public', 'unlisted', 'private')),
  thumbnail_path text,
  thumbnail_type text,
  notify_subscribers boolean not null default false,
  notified_broadcast_id text,
  embeddable boolean not null default true,
  dvr boolean not null default true,
  made_for_kids boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into livestream_settings (id) values (1) on conflict (id) do nothing;

create table if not exists instagram_destinations (
  kind text primary key check (kind in ('public', 'practice')),
  stream_url text not null,
  stream_key text not null,
  saved_at timestamptz not null default now()
);

alter table youtube_accounts enable row level security;
alter table livestream_settings enable row level security;
alter table instagram_destinations enable row level security;

insert into storage.buckets (id, name, public)
values ('livestream', 'livestream', false)
on conflict (id) do nothing;
