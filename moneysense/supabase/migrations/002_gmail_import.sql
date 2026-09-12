-- Migration: Gmail auto-import support.
-- Run this in the Supabase SQL editor. Safe to run more than once.

-- Store the user's Gmail connection on their profile.
alter table public.profiles
  add column if not exists gmail_refresh_token text,
  add column if not exists gmail_email text,
  add column if not exists gmail_last_sync timestamptz;

-- Track which Gmail messages we've already imported, to avoid duplicates.
create table if not exists public.gmail_messages (
  user_id    uuid not null references auth.users(id) on delete cascade,
  gmail_id   text not null,
  created_at timestamptz default now(),
  primary key (user_id, gmail_id)
);

alter table public.gmail_messages enable row level security;

drop policy if exists "gmail_messages_select_own" on public.gmail_messages;
create policy "gmail_messages_select_own" on public.gmail_messages
  for select using (auth.uid() = user_id);
drop policy if exists "gmail_messages_insert_own" on public.gmail_messages;
create policy "gmail_messages_insert_own" on public.gmail_messages
  for insert with check (auth.uid() = user_id);
drop policy if exists "gmail_messages_delete_own" on public.gmail_messages;
create policy "gmail_messages_delete_own" on public.gmail_messages
  for delete using (auth.uid() = user_id);
