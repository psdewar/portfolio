-- Run this in Supabase SQL Editor
-- Creates table to track purchases for download link validation

create table if not exists purchases (
  id uuid default gen_random_uuid() primary key,
  session_id text unique not null,
  email text not null,
  product_id text not null,
  product_name text,
  downloadable_assets text[], -- array of asset IDs
  amount_cents integer,
  payment_status text default 'paid',
  download_count integer default 0,
  email_sent boolean default false,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '30 days')
);

-- Index for fast lookups
create index if not exists idx_purchases_session_id on purchases(session_id);
create index if not exists idx_purchases_email on purchases(email);

-- Row Level Security (optional but recommended)
alter table purchases enable row level security;

-- Only allow server-side access (service role key)
create policy "Service role only" on purchases
  for all using (auth.role() = 'service_role');
