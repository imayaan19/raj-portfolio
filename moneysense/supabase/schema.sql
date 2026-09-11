-- ===========================================================================
-- MoneySense AI — Database schema + Row Level Security
-- Run this in the Supabase SQL editor (or `supabase db push`).
--
-- Every financial table carries user_id and is protected by RLS so a user can
-- only ever read/write their own rows:  USING (auth.uid() = user_id).
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text,
  email           text,
  monthly_income  numeric(14,2) default 0,
  currency        text default 'INR',
  savings_target  numeric(14,2) default 0,
  risk_profile    text default 'moderate',   -- conservative | moderate | growth | aggressive
  onboarded       boolean default false,
  employment_type text,
  ingest_token    text unique,               -- secret token for the SMS/email import webhook

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- financial_profile  (fixed commitments + reserves)
-- ---------------------------------------------------------------------------
create table if not exists public.financial_profile (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  monthly_income    numeric(14,2) default 0,
  current_cash      numeric(14,2) default 0,
  rent              numeric(14,2) default 0,
  emi               numeric(14,2) default 0,
  utilities         numeric(14,2) default 0,
  food_budget       numeric(14,2) default 0,
  transport_budget  numeric(14,2) default 0,
  insurance         numeric(14,2) default 0,
  other_fixed       numeric(14,2) default 0,
  savings_target    numeric(14,2) default 0,
  emergency_fund    numeric(14,2) default 0,
  high_cost_debt    numeric(14,2) default 0,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  unique (user_id)
);

-- ---------------------------------------------------------------------------
-- expenses / transactions
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  amount           numeric(14,2) not null,
  merchant         text,
  category         text not null default 'Others',
  payment_method   text default 'UPI',       -- UPI | Credit Card | Debit Card | Cash | Bank Transfer | Other
  transaction_date date not null default current_date,
  notes            text,
  recurring        boolean default false,
  source           text default 'Manual',    -- Manual | Receipt | Bank | Credit Card | UPI | SMS | Email
  created_at       timestamptz default now()
);
create index if not exists expenses_user_date_idx on public.expenses (user_id, transaction_date desc);
create index if not exists expenses_user_category_idx on public.expenses (user_id, category);

-- ---------------------------------------------------------------------------
-- budgets  (per category, per month)
-- ---------------------------------------------------------------------------
create table if not exists public.budgets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  category   text not null,
  amount     numeric(14,2) not null default 0,
  month      text not null,                  -- 'YYYY-MM'
  created_at timestamptz default now(),
  unique (user_id, category, month)
);
create index if not exists budgets_user_month_idx on public.budgets (user_id, month);

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  target_amount  numeric(14,2) not null default 0,
  current_amount numeric(14,2) not null default 0,
  target_date    date,
  category       text default 'Custom',
  horizon_months integer,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists goals_user_idx on public.goals (user_id);

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  amount            numeric(14,2) not null default 0,
  frequency         text default 'monthly',  -- weekly | monthly | quarterly | yearly
  next_payment_date date,
  category          text default 'Bills',
  active            boolean default true,
  last_used_days    integer,                 -- days since last use (for unused flag)
  created_at        timestamptz default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- investments  (manual portfolio entry)
-- ---------------------------------------------------------------------------
create table if not exists public.investments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  asset_name      text not null,
  asset_class     text default 'Equity',     -- Equity | Debt | Cash | Gold | Other
  invested_amount numeric(14,2) not null default 0,
  current_value   numeric(14,2) not null default 0,
  goal_id         uuid references public.goals(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists investments_user_idx on public.investments (user_id);

-- ---------------------------------------------------------------------------
-- recurring_transactions  (future-ready import scaffolding)
-- ---------------------------------------------------------------------------
create table if not exists public.recurring_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  merchant   text,
  amount     numeric(14,2) not null default 0,
  frequency  text default 'monthly',
  category   text default 'Others',
  next_date  date,
  created_at timestamptz default now()
);
create index if not exists recurring_user_idx on public.recurring_transactions (user_id);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  message    text,
  read       boolean default false,
  created_at timestamptz default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- merchant_categories  (shared learning table — global, read-only for users)
-- ---------------------------------------------------------------------------
create table if not exists public.merchant_categories (
  id                 uuid primary key default gen_random_uuid(),
  merchant_name      text not null unique,
  suggested_category text not null,
  created_at         timestamptz default now()
);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.profiles              enable row level security;
alter table public.financial_profile     enable row level security;
alter table public.expenses              enable row level security;
alter table public.budgets               enable row level security;
alter table public.goals                 enable row level security;
alter table public.subscriptions         enable row level security;
alter table public.investments           enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.notifications         enable row level security;
alter table public.merchant_categories   enable row level security;

-- profiles: user owns their profile row (id == auth.uid())
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- Generic per-user policy generator for the remaining tables.
do $$
declare t text;
begin
  foreach t in array array[
    'financial_profile','expenses','budgets','goals','subscriptions',
    'investments','recurring_transactions','notifications'
  ]
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

-- merchant_categories is a shared reference table: any authenticated user may read.
drop policy if exists "merchant_categories_read" on public.merchant_categories;
create policy "merchant_categories_read" on public.merchant_categories
  for select using (auth.role() = 'authenticated');

-- ===========================================================================
-- Trigger: auto-create a profile row when a new auth user signs up.
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- Seed the shared merchant → category mapping.
-- ===========================================================================
insert into public.merchant_categories (merchant_name, suggested_category) values
  ('zomato','Food'), ('swiggy','Food'), ('dominos','Food'), ('mcdonald','Food'),
  ('starbucks','Food'), ('kfc','Food'), ('blinkit','Food'), ('zepto','Food'),
  ('bigbasket','Food'), ('uber','Transport'), ('ola','Transport'),
  ('rapido','Transport'), ('irctc','Transport'), ('indian oil','Transport'),
  ('hp petrol','Transport'), ('amazon','Shopping'), ('flipkart','Shopping'),
  ('myntra','Shopping'), ('ajio','Shopping'), ('nykaa','Shopping'),
  ('netflix','Entertainment'), ('spotify','Entertainment'),
  ('prime video','Entertainment'), ('hotstar','Entertainment'),
  ('bookmyshow','Entertainment'), ('pharmeasy','Health'), ('apollo','Health'),
  ('cult.fit','Health'), ('gym','Health'), ('byju','Education'),
  ('udemy','Education'), ('coursera','Education'), ('unacademy','Education'),
  ('electricity','Bills'), ('airtel','Bills'), ('jio','Bills'),
  ('google one','Bills'), ('makemytrip','Travel'), ('goibibo','Travel'),
  ('indigo','Travel'), ('oyo','Travel')
on conflict (merchant_name) do nothing;
