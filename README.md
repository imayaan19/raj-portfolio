# Campus Companion — Full-Stack App

A cross-platform mobile app (Expo / React Native) with a Node.js + TypeScript backend,
Prisma + PostgreSQL, JWT + Google auth, and **direct Gmail API sync** for faculty
feedback reminders.

## Modules

| Module | Description |
|---|---|
| 💰 Expense Tracker | Log, categorize and view monthly totals (cloud-synced) |
| 🏋️ Gym Routine Tracker | Workout logger with preset routines saved to the cloud |
| 🎓 Faculty Feedback Reminder | Tasks auto-pulled from Gmail + manual entries, with status toggles & push notifications |
| 📚 Case Pre-Reads | Structured knowledge base (Title, Source, Key Problems, Core Analysis, Actionable Takeaways) |

## Repo layout

```
.
├── backend/     Node + Express + TypeScript API, Prisma, Gmail integration
└── mobile/      Expo (React Native + TypeScript) app
```

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env          # fill in the values (see below)
npm install
npx prisma migrate dev --name init
npm run dev                   # http://localhost:4000
```

### 2. Mobile

```bash
cd mobile
npm install
# set EXPO_PUBLIC_API_URL in mobile/.env to your backend URL
npx expo start                # scan the QR code with Expo Go
```

## What needs YOUR credentials

The scaffold is fully runnable, but three integrations need secrets you create in the
[Google Cloud Console](https://console.cloud.google.com/):

1. **Google Sign-In** — an OAuth 2.0 Web client ID (`GOOGLE_CLIENT_ID`).
2. **Gmail API** — enable the Gmail API and reuse the OAuth client
   (`GOOGLE_CLIENT_SECRET`, redirect URI `GOOGLE_REDIRECT_URI`).
3. **Push notifications** — handled by Expo automatically; no key needed for Expo Go.

See [`backend/.env.example`](backend/.env.example) and the "Google setup" section below.

## Deploy (Render)

`backend/render.yaml` provisions a web service + a free Postgres instance. Push to a
GitHub repo, then in Render: **New → Blueprint → pick the repo**. Set the secret env
vars (`JWT_SECRET`, `GOOGLE_*`) in the dashboard.

## Google setup (for Gmail sync)

1. Create a project → **APIs & Services → Library → enable "Gmail API"**.
2. **Credentials → Create OAuth client ID → Web application.**
3. Add authorized redirect URI: `http://localhost:4000/api/gmail/callback`
   (and your deployed `https://<app>.onrender.com/api/gmail/callback`).
4. **OAuth consent screen**: add scope `https://www.googleapis.com/auth/gmail.readonly`
   and add your college email as a test user.
5. Copy the client ID/secret into `backend/.env`.
