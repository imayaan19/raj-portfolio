# API Reference — Campus Companion

Base URL: `http://localhost:4000/api` (all routes below are relative to it).
All routes except `/auth/*` and `/gmail/callback` require `Authorization: Bearer <JWT>`.

## Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password, name? }` | Returns `{ token, user }` |
| POST | `/auth/login` | `{ email, password }` | Returns `{ token, user }` |
| POST | `/auth/google` | `{ idToken }` | Verifies Google ID token, upserts user |
| GET | `/auth/me` | — | Current user + Gmail status |

## Gmail integration

| Method | Path | Notes |
|---|---|---|
| GET | `/gmail/connect` | Returns `{ url }` — open in browser for consent |
| GET | `/gmail/callback` | Google redirects here; stores tokens |
| GET | `/gmail/status` | `{ connected, email, lastSyncedAt }` |
| POST | `/gmail/sync` | Fetches + parses emails → reminders. Returns `{ scanned, created, updated }` |
| DELETE | `/gmail/disconnect` | Removes stored tokens |

**Sync pipeline:** `searchMessages()` runs a Gmail query
`("feedback" OR "evaluation" OR …) newer_than:90d`, then `parseMessage()` extracts
**course** (code like `MKT101`, or "Course: …"), **sender** (display name),
and **due date** (ISO, `DD/MM/YYYY`, "25 August 2026", "tomorrow", "in 3 days").
Reminders are upserted on `(userId, gmailMessageId)` so re-syncing never duplicates.

## Reminders (Faculty Feedback)

| Method | Path | Body |
|---|---|---|
| GET | `/reminders?status=pending\|done` | — |
| POST | `/reminders` | `{ title, course?, sender?, dueDate? }` |
| PATCH | `/reminders/:id` | any of the above + `{ status }` |
| DELETE | `/reminders/:id` | — |

## Expenses

| Method | Path | Body / Query |
|---|---|---|
| GET | `/expenses?month=YYYY-MM` | — |
| GET | `/expenses/summary?month=YYYY-MM` | Returns `{ total, byCategory[] }` |
| POST | `/expenses` | `{ amount, category, note?, date? }` |
| PATCH | `/expenses/:id` | partial |
| DELETE | `/expenses/:id` | — |

## Workouts & Routines

| Method | Path | Body |
|---|---|---|
| GET | `/workouts` | — |
| POST | `/workouts` | `{ name, notes?, exercises: [{name,sets?,reps?,weight?}] }` |
| DELETE | `/workouts/:id` | — |
| GET | `/workouts/routines` | user routines + presets |
| POST | `/workouts/routines` | `{ name, exercises }` |
| DELETE | `/workouts/routines/:id` | — |

## Case Pre-Reads

| Method | Path | Body / Query |
|---|---|---|
| GET | `/prereads?q=search` | — |
| GET | `/prereads/:id` | — |
| POST | `/prereads` | `{ title, source?, keyProblems?, coreAnalysis?, actionableTakeaways? }` |
| PATCH | `/prereads/:id` | partial |
| DELETE | `/prereads/:id` | — |

## Health

`GET /health` → `{ status: "ok", ts }` (no auth) — used by Render health checks.
