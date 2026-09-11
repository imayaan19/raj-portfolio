-- Migration: add the SMS/email import webhook token to profiles.
-- Run this in the Supabase SQL editor if your database was created before
-- the auto-import feature was added. (Safe to run more than once.)

alter table public.profiles
  add column if not exists ingest_token text;

-- Ensure tokens are unique (ignore the error if the constraint already exists).
do $$
begin
  alter table public.profiles add constraint profiles_ingest_token_key unique (ingest_token);
exception
  when duplicate_table then null;
  when duplicate_object then null;
end $$;
