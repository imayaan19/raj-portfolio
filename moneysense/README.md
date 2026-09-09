# 💰 MoneySense AI — Your AI Financial Copilot

> **Don't just track where your money went. Know where it is going, what you can afford, and how your surplus can support your goals.**

MoneySense AI is a production-quality, multi-user, AI-powered personal finance
web app. It goes beyond expense tracking to help users **Track → Understand →
Predict → Decide → Allocate → Grow**.

Built with Next.js (App Router) + TypeScript, Supabase (Auth · Postgres · RLS),
OpenAI, Tailwind CSS and Recharts.

---

## ✨ Feature highlights

| Area | What it does |
|------|--------------|
| **Auth** | Email/password + Google OAuth, forgot/reset password, protected routes, session persistence |
| **Onboarding** | Beautiful 5-step setup (personal → commitments → savings → goals → risk) |
| **Dashboard** | Income, expenses, savings, savings rate, available balance, investable surplus, AI insight, spending overview, monthly trend, recent transactions |
| **Transactions** | Search, filter (category/month/method), sort, edit, delete, pagination |
| **Add Expense** | Smart merchant→category suggestion, recurring toggle, **receipt scanning** (OpenAI vision) |
| **Budgets** | Per-category monthly budgets with 75/90/100% warning levels |
| **Goals** | Progress, required monthly contribution, on-track status |
| **Analytics** | Donut / bar / line charts, top merchants, category growth, behavioral analytics, **money-leak detection** with transparent calculations |
| **AI Copilot** | Conversational finance assistant grounded in your own structured data |
| **Can I Afford This?** | Verdict (🟢🟡🔴) + **financial consequence engine** (before/after) + invest-or-spend trade-offs |
| **Investments** | Investable-surplus calculation, financial readiness check, allocation framework, **investment simulator** (3 scenarios), manual portfolio tracking, goal buckets, cash-vs-investment alerts, high-cost-debt check |
| **Subscriptions** | Monthly/annualized totals, unused-service flags |
| **Monthly Review** | Financial health score (0–100), transparent cash-flow prediction, what-changed, AI summary |
| **Notifications** | Alert center with read/unread state |
| **Security** | Row-Level Security, per-user data isolation, server-side AI calls, input validation, rate limiting, account deletion |

The finance engine (`src/lib/finance.ts`) is **pure, deterministic and
transparent** — the AI consumes its structured output rather than doing math
itself, so the numbers stay consistent everywhere. **The app is fully usable
without an OpenAI key** (the Copilot falls back to a rule-based summary).

---

## 🧱 Tech stack

- **Framework:** Next.js 14 (App Router) · React 18 · TypeScript
- **Styling:** Tailwind CSS · Lucide icons · custom design system (`src/components/ui.tsx`)
- **Auth & DB:** Supabase Auth · Supabase Postgres · Row Level Security
- **AI:** OpenAI (server-side only)
- **Charts:** Recharts
- **Hosting:** Vercel

---

## 🚀 Getting started

### 1. Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key (optional but recommended)

### 2. Install
```bash
cd moneysense
npm install
```

### 3. Configure environment
```bash
cp .env.example .env.local
```
Fill in the values (see `.env.example` for details):

| Variable | Where |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (server-only) |
| `OPENAI_API_KEY` | OpenAI dashboard (server-only) |

> 🔒 **Never** prefix the OpenAI or service-role key with `NEXT_PUBLIC_`. They
> are used only in server code (`src/lib/ai.ts`, API routes, server actions).

### 4. Set up the database
In the Supabase SQL editor, run the contents of [`supabase/schema.sql`](./supabase/schema.sql).
This creates all tables, indexes, **Row Level Security policies**, the
`auth.users → profiles` trigger, and seeds the shared merchant→category map.

### 5. (Optional) Enable Google login
In Supabase → Authentication → Providers → Google, add your OAuth credentials and
set the redirect URL to `https://<your-domain>/auth/callback`.

### 6. Seed the demo user
```bash
npm run seed
```
Creates **Raj Sharma** (`demo@moneysense.ai` / `Demo123!moneysense`) with realistic
transactions across the current and previous month, budgets, goals, subscriptions,
investments and an emergency fund — so analytics and insights work immediately.
Log in via the landing page's **"Try the demo"** button.

### 7. Run
```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

---

## ☁️ Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, **New Project → Import** the repo. Set the **Root Directory** to
   `moneysense` (this app lives in a subfolder).
3. Framework preset: **Next.js** (auto-detected).
4. Add the environment variables from `.env.local` in **Settings → Environment
   Variables** (set `NEXT_PUBLIC_APP_URL` to your Vercel URL).
5. In Supabase → Authentication → URL Configuration, add your Vercel URL to the
   allowed redirect URLs (`https://<your-app>.vercel.app/auth/callback`).
6. Deploy. Run the SQL schema and (optionally) `npm run seed` against your
   production Supabase project.

---

## 🔐 Security & privacy

- **Row Level Security** on every table: `USING (auth.uid() = user_id)` — a user
  can only ever read/write their own rows. No user can access another user's data.
- AI calls run **server-side only**; the OpenAI key never reaches the browser.
- API routes validate input and apply a simple per-user rate limit.
- Account deletion cascades to all financial rows (FK `on delete cascade`).
- Privacy is surfaced in the UX ("Your financial information is private to your account.").

---

## ⚖️ Important disclaimers

MoneySense AI is an **educational prototype** focused on **tracking, analysis,
education and scenario modeling**. It does **not**:
- execute real investments or connect to bank accounts,
- guarantee returns or promise profits,
- recommend investing your entire balance,
- present projections as guaranteed outcomes.

All projections state their assumptions (e.g. *"Illustrative scenario based on a
10% annual return assumption. Actual returns may be higher or lower, and
investments can lose value."*). The Financial Health Score is an internal
budgeting indicator, **not a credit score**. This is not individualized
financial advice.

---

## 🗂️ Project structure

```
moneysense/
├── src/
│   ├── app/
│   │   ├── (app)/            # Protected app (dashboard, transactions, …)
│   │   ├── api/              # copilot · afford · receipt (server-only)
│   │   ├── auth/             # OAuth callback + signout
│   │   ├── login · signup · onboarding · …
│   ├── components/           # UI system, charts, feature managers
│   ├── lib/
│   │   ├── finance.ts        # ★ pure finance engine (all the math)
│   │   ├── ai.ts             # structured context + OpenAI wrapper
│   │   ├── actions.ts        # server actions (CRUD)
│   │   ├── data.ts           # RLS-scoped data loading
│   │   └── supabase/         # browser · server · middleware clients
│   └── middleware.ts         # session refresh + route protection
├── supabase/schema.sql       # tables + indexes + RLS policies + triggers
├── scripts/seed.mjs          # demo data seeder
└── .env.example
```

## 🔮 Future-ready import architecture

Every expense carries an abstract `source` field (`Manual · Receipt · Bank ·
Credit Card · UPI · SMS · Email`) and a `recurring_transactions` table exists, so
future automatic imports (bank/UPI/SMS/email) can be layered in without schema
changes. The prototype uses **Manual + Receipt + demo data**.

## 📝 A note on dependencies

Pinned to the latest **Next.js 14.2.x** (stable App Router). `npm audit` reports
advisories that only resolve by upgrading to Next 16 (a major React-19 breaking
migration); the affected surfaces (Edge-runtime payloads, AVIF image
optimization, rewrites to attacker hostnames, Windows-hosted RCE) are not used by
this app. Upgrade to Next 16 when undertaking a dedicated migration.
