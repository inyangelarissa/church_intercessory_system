# ERC Masoro — Intercession Management System

A full-stack web app for managing prayer requests, intercessors, prayer
schedules and activity records for Evangelical Restoration Church – Masoro.

- **Frontend:** React 19 + TypeScript + Tailwind CSS v4 + Vite
- **Backend:** Node.js + Express, REST API
- **Database:** SQLite (via `better-sqlite3`), normalized relational schema
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
(`server/erc_masoro.sqlite3` locally). There is no demo data.

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

# Option 2: run once from a shell that can reach the database
npm run create-senior -- "Full Name" pastor@yourchurch.org "choose-a-strong-password"
```

If an existing account uses that email it is promoted to Senior Intercessor and
its password is set to the one supplied.

## Deploying (Fly.io)

SQLite is a file, so it needs a disk that survives restarts. `fly.toml` mounts
a Fly volume at `/data` and points `DATABASE_PATH` at it. One-time setup:

```bash
fly volumes create erc_data --region iad --size 1
fly secrets set SENIOR_EMAIL=pastor@yourchurch.org SENIOR_PASSWORD='...' SENIOR_NAME='Full Name'
fly deploy
fly scale count 1        # a volume attaches to a single machine
```

`JWT_SECRET` is optional: if it isn't set, a random signing key is generated
once and stored in the database.

> **Vercel is not suitable for this app.** Serverless functions have no
> persistent disk and run as many separate instances, so a SQLite file there is
> wiped between requests and is not shared. Accounts created on one instance
> "disappear" on the next, which shows up as "Invalid email or password" right
> after signing up. To stay on Vercel you must replace SQLite with a hosted
> database (Postgres/Turso). The `api/` wrappers and `vercel.json` are only
> kept for that case.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_PATH` | Full path of the SQLite file (production: `/data/erc_masoro.sqlite3`) |
| `SENIOR_EMAIL`, `SENIOR_PASSWORD`, `SENIOR_NAME` | Creates/updates the Senior Intercessor account on startup |
| `JWT_SECRET` | Optional signing key (otherwise generated and stored in the DB) |
| `PORT` | HTTP port (`8080` on Fly) |

### Resetting the database

Delete the SQLite files and restart the server:

```bash
rm server/erc_masoro.sqlite3*
npm run server
```

## Project structure

```
src/                  React frontend
  components/         Page components (Home, Auth, Dashboard, PrayerRequests,
                       Intercessors, Schedule, ActivityRecords, Sidebar)
  lib/api.ts           Frontend API client (fetch wrapper, JWT handling)
server/                Express backend
  db.js                SQLite schema
  auth.js              JWT sign/verify + role middleware
  seniorAccount.js     Creates the Senior Intercessor account
  scripts/             create-senior.js
  index.js              App entry point, mounts routes
  routes/               One file per resource (auth, prayerRequests,
                       intercessors, schedule, activityRecords)
```

## API overview

Everything except the three public routes needs `Authorization: Bearer <token>`.

| Method | Path | Who | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | public | Create an Intercessor account |
| POST | `/api/auth/login` | public | Log in, returns a JWT |
| POST | `/api/prayer-requests/public` | public | Congregation submits a request (rate-limited) |
| GET | `/api/auth/me` | any | Current user |
| GET | `/api/dashboard/stats` | any | Counts (scoped to own assignments for Intercessors) |
| GET | `/api/prayer-requests` | any | Senior: all. Intercessor: only those assigned to them |
| POST | `/api/prayer-requests` | Senior | Record a request on someone's behalf |
| PATCH | `/api/prayer-requests/:id` | Senior / assigned Intercessor | Senior: assign, priority, status. Intercessor: status, notes, testimony |
| DELETE | `/api/prayer-requests/:id` | Senior | Delete a request |
| GET | `/api/intercessors` | any | Roster |
| POST | `/api/intercessors` | Senior | Register an intercessor |
| PATCH | `/api/intercessors/:id` | Senior | Mark Active / Inactive |
| GET / POST | `/api/schedule` | any | Prayer sessions |
| GET / POST | `/api/activity-records` | any | Session logs |

## Troubleshooting

**`npm install` fails on `better-sqlite3` with a `node-gyp` / Python error.**
`better-sqlite3` ships prebuilt binaries for common platforms, downloaded
automatically on install — this error means npm fell back to compiling it
from source and couldn't find a C++ build toolchain. Fixes, in order of
preference:
1. Make sure you're on Node.js 18 or newer (`node -v`) and have a normal
   internet connection, then try `npm install` again — a transient network
   hiccup during the prebuilt-binary download is the most common cause.
2. On Windows: install the "Desktop development with C++" workload from the
   [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/),
   or run `npm install --global windows-build-tools` (older Node versions).
3. On macOS: run `xcode-select --install`.
4. On Linux: `sudo apt install build-essential python3`.

**Port already in use.** The frontend defaults to port 8443 and the API to
5174. Override with `PORT=3000 npm run client` or `API_PORT=4000 npm run dev`
(and update the proxy target in `vite.config.ts` if you change the API port).
