-- ===========================================================================
-- MoneySense — Round 2 "agent" upgrade
-- Adds: explained-spend tracking on transactions, the weekly spend envelope,
-- and a simulated weekly-sweep ledger (the L3 autonomy action).
--
-- Run this in the Supabase SQL editor on an existing project. It is additive
-- and safe to re-run.
-- ===========================================================================

-- 1) Transaction-level fields the agent needs -------------------------------
--    explained     : has this debit been accounted for? (the 95% target)
--    confidence    : 0-1, how sure auto-categorisation was
--    upi_reference : the UPI/txn reference the "receipts rail" (Q5) would key on
alter table public.expenses
  add column if not exists explained     boolean       default true,
  add column if not exists confidence    numeric(4,3)  default 1.0,
  add column if not exists upi_reference text;

-- 2) The weekly spend envelope + L3 limits (one row per user) ----------------
create table if not exists public.agent_settings (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  weekly_amount  numeric(14,2) default 0,     -- ₹X swept into the spend account each week
  ask_ceiling    numeric(14,2) default 2000,  -- "ask me before any move above ₹___"
  payday_weekday integer       default 1,      -- 0=Sun … 1=Mon … 6=Sat
  auto_sweep     boolean       default true,   -- the STOP switch (false = paused)
  savings_pool   numeric(14,2) default 0,     -- simulated savings side of the sweep
  spend_balance  numeric(14,2) default 0,     -- simulated spend account balance
  last_sweep_at  timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- 3) The sweep ledger — every simulated move, announced and revocable --------
create table if not exists public.sweeps (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  amount     numeric(14,2) not null default 0,
  kind       text default 'weekly',     -- weekly | topup
  note       text,
  simulated  boolean default true,
  created_at timestamptz default now()
);
create index if not exists sweeps_user_idx on public.sweeps (user_id, created_at desc);

-- 4) RLS ---------------------------------------------------------------------
alter table public.agent_settings enable row level security;
alter table public.sweeps         enable row level security;

do $$
declare t text;
begin
  foreach t in array array['agent_settings','sweeps']
  loop
    execute format('drop policy if exists "%s_select_own" on public.%I;', t, t);
    execute format('create policy "%s_select_own" on public.%I for select using (auth.uid() = user_id);', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I;', t, t);
    execute format('create policy "%s_insert_own" on public.%I for insert with check (auth.uid() = user_id);', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I;', t, t);
    execute format('create policy "%s_update_own" on public.%I for update using (auth.uid() = user_id);', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I;', t, t);
    execute format('create policy "%s_delete_own" on public.%I for delete using (auth.uid() = user_id);', t, t);
  end loop;
end $$;

-- 5) Demo backfill -----------------------------------------------------------
-- Give existing data a realistic "explained-spend" starting point: anything
-- auto-imported (not typed by the user) or landing in "Others" starts life
-- as unexplained, so the weekly question queue has something to show.
update public.expenses
   set explained  = false,
       confidence = 0.4
 where explained is distinct from false
   and (source <> 'Manual' or category = 'Others');
