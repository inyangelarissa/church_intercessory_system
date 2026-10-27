# ERC Masoro — Intercession Management System

A full-stack web app for managing prayer requests, intercessors, and prayer
schedules for Evangelical Restoration Church – Masoro.

- **Frontend:** React 19 + TypeScript + Tailwind CSS v4 + Vite
- **Backend:** Node.js + Express, REST API
- **Database:** libSQL / SQLite (via `@libsql/client`): a hosted Turso database in production, a local file in development
- **Auth:** JWT sessions, bcrypt-hashed passwords

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` starts **both** the Vite frontend (http://localhost:8443) and
the Express API (http://localhost:5174) together, using
[concurrently](https://www.npmjs.com/package/concurrently). Vite proxies any
request to `/api/...` through to the API server, so you only need to open
http://localhost:8443 in your browser.

To run them separately (e.g. in two terminals):

```bash
npm run client   # Vite frontend only
npm run server   # Express API only
```

The first time the API server starts it creates an **empty** SQLite database
(`server/erc_masoro.sqlite3` locally). There is no demo data. Nothing else to
configure for local development.

## Roles

| Role | What they can do |
|---|---|
| **Senior Intercessor** (admin) | Sees every prayer request. The **only** role that assigns requests to intercessors, marks intercessors Active/Inactive, registers intercessors, records requests on someone's behalf, and deletes requests. |
| **Intercessor** | Signs up from the app. Sees **only the requests assigned to them** and can update their status, progress notes and testimony. Cannot assign, reassign or change priority, and cannot change anyone's Active/Inactive status. |
| **Congregation** (no login) | Submits a prayer request from the home page. It lands on the Senior Intercessor's dashboard under "New Requests Awaiting Assignment". |

Public sign-up **always** creates a regular Intercessor. The Senior Intercessor
account can only be created on the server:

```bash
# Option 1 (recommended for deployments): set environment variables.
# The account is created/updated every time the server starts.
SENIOR_EMAIL=pastor@yourchurch.org
SENIOR_PASSWORD=choose-a-strong-password   # min 8 characters
SENIOR_NAME="Full Name"

# Option 2: run once from your computer. It uses whichever database your shell points at,
# so for production set TURSO_DATABASE_URL / TURSO_AUTH_TOKEN first.
npm run create-senior -- "Full Name" pastor@yourchurch.org "choose-a-strong-password"
```

If an existing account uses that email it is promoted to Senior Intercessor and
its password is set to the one supplied.

## Deploying to Vercel

Vercel functions have no persistent disk, so the data lives in a hosted
[Turso](https://turso.tech) database (free tier is plenty). Setup takes about
five minutes:

**1. Create the database** (Turso dashboard, or the CLI):

```bash
turso db create erc-masoro
turso db show erc-masoro --url          # -> TURSO_DATABASE_URL  (libsql://...)
turso db tokens create erc-masoro       # -> TURSO_AUTH_TOKEN
```

**2. Add environment variables** in Vercel: *Project -> Settings -> Environment Variables*
(tick Production, Preview and Development):

| Variable | Value |
|---|---|
| `TURSO_DATABASE_URL` | the `libsql://...` URL from step 1 |
| `TURSO_AUTH_TOKEN` | the token from step 1 |
| `SENIOR_EMAIL` | the pastor's login email |
| `SENIOR_PASSWORD` | 8+ characters |
| `SENIOR_NAME` | the pastor's full name |
| `JWT_SECRET` | any long random string (`openssl rand -hex 32`) |

**3. Redeploy** (*Deployments -> ... -> Redeploy*). Tables are created
automatically on the first request, and the Senior Intercessor account is
created from the `SENIOR_*` variables.

**4. Check it:** open `https://<your-app>.vercel.app/api/health`. You should see
`{"status":"ok", ... "database":"ok"}`. If you see `database: unavailable`, one of
the `TURSO_*` variables is missing or wrong.

How it fits together: Vite builds the frontend into `dist/` (served by
Vercel's CDN). Every `/api/*` request is rewritten to the single function
`api/index.js`, which runs the Express app in `server/`.

## Deploying to Fly.io (alternative)

You can instead run it as one long-lived server with the SQLite file on a disk.
`fly.toml` mounts a Fly volume at `/data` and points `DATABASE_PATH` at it:

```bash
fly volumes create erc_data --region iad --size 1
fly secrets set SENIOR_EMAIL=pastor@yourchurch.org SENIOR_PASSWORD='...' SENIOR_NAME='Full Name'
fly deploy
fly scale count 1        # a volume attaches to a single machine
```

### Environment variables

| Variable | Purpose |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Hosted database (**required on Vercel**) |
| `DATABASE_PATH` | Local SQLite file path instead (Fly: `/data/erc_masoro.sqlite3`) |
| `SENIOR_EMAIL`, `SENIOR_PASSWORD`, `SENIOR_NAME` | Creates/updates the Senior Intercessor account on startup |
| `JWT_SECRET` | Signing key for login tokens. Recommended; if unset, one is generated and stored in the database |
| `PORT` | HTTP port outside Vercel (`8080` on Fly) |

Copy `.env.example` for a template. Never commit a real `.env`.

### Resetting the database

Delete the SQLite files and restart the server:

```bash
rm server/erc_masoro.sqlite3*
npm run server
```

On Turso, drop the tables from the Turso shell (`turso db shell erc-masoro`) or
create a fresh database and update the two `TURSO_*` variables.

## Project structure

```
src/                  React frontend
  components/         Page components (Home, Auth, Dashboard, Everything,
                       PrayerRequests, Intercessors, Schedule, Sidebar)
  lib/api.ts           Frontend API client (fetch wrapper, JWT handling)
server/                Express backend
  db.js                Database connection + schema (libSQL)
  auth.js              JWT sign/verify + role middleware
  seniorAccount.js     Creates the Senior Intercessor account
  scripts/             create-senior.js
  index.js              App entry point, mounts routes
  routes/               One file per resource (auth, prayerRequests,
                       intercessors, schedule)
```

## API overview

Everything except the three public routes needs `Authorization: Bearer <token>`.

| Method | Path | Who | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | public | Create an Intercessor account |
| POST | `/api/auth/login` | public | Log in, returns a JWT |
| POST | `/api/prayer-requests/public` | public | Congregation submits a request (rate-limited) |
| GET | `/api/auth/me` | any | Current user |
| GET | `/api/reports` | Senior | All users and prayer requests for the Everything page and CSV reports |
| GET | `/api/dashboard/stats` | any | Counts (scoped to own assignments for Intercessors) |
| GET | `/api/prayer-requests` | any | Senior: all. Intercessor: only those assigned to them |
| POST | `/api/prayer-requests` | Senior | Record a request on someone's behalf |
| PATCH | `/api/prayer-requests/:id` | Senior / assigned Intercessor | Senior: assign, priority, status. Intercessor: status, notes, testimony |
| DELETE | `/api/prayer-requests/:id` | Senior | Delete a request |
| GET | `/api/intercessors` | any | Roster |
| POST | `/api/intercessors` | Senior | Register an intercessor |
| PATCH | `/api/intercessors/:id` | Senior | Mark Active / Inactive |
| GET / POST | `/api/schedule` | any | Prayer sessions |

## Troubleshooting

**"Invalid email or password" right after signing up on Vercel / `/api/health` says `database: unavailable`.**
The `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` variables are missing or wrong, or you
changed them without redeploying. Fix them in Vercel and redeploy.

**Can't log in as the Senior Intercessor.** Check `SENIOR_EMAIL` / `SENIOR_PASSWORD`
in Vercel (password must be 8+ characters), then redeploy. The account is
created/updated on startup.

**Port already in use.** The frontend defaults to port 8443 and the API to
5174. Override with `PORT=3000 npm run client` or `API_PORT=4000 npm run dev`
(and update the proxy target in `vite.config.ts` if you change the API port).
