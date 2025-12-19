-- Simple inventory table for t-shirt stock
-- Run this in Supabase SQL Editor

create table if not exists inventory (
  sku text primary key,  -- e.g., "black-small", "white-medium"
  quantity integer default 0
);

-- Insert your current stock
insert into inventory (sku, quantity) values
  ('black-small', 6),
  ('black-medium', 11),
  ('black-large', 2),
  ('white-small', 11),
  ('white-medium', 12),
  ('white-large', 7)
on conflict (sku) do update set quantity = excluded.quantity;

-- Public read access (anyone can see stock levels)
alter table inventory enable row level security;

create policy "Public read" on inventory
  for select using (true);

create policy "Service role write" on inventory
  for all using (auth.role() = 'service_role');
