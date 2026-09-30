-- Run this in Supabase SQL Editor (after 006).
-- Caches the live chat id for the current broadcast so the chat bridge skips a broadcast lookup per poll.

alter table youtube_accounts
  add column if not exists live_chat_id text,
  add column if not exists chat_broadcast_id text;
