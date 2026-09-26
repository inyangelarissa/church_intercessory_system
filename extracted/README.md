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

The first time the API server starts, it creates `server/erc_masoro.sqlite3`
and seeds it with demo data (intercessors, prayer requests, a weekly
schedule, and activity records) matching what's shown in the UI.

### Demo login

| Email | Password |
|---|---|
| `admin@ercmasoro.org` | `ercmasoro2026` |

You can also sign up a new account from the app's Sign Up tab.

### Resetting the database

Delete the SQLite files and restart the server to reseed from scratch:

```bash
rm server/erc_masoro.sqlite3*
npm run server
```

## Project structure

```
src/                  React frontend
  components/         Page components (Home, Auth, Dashboard, PrayerRequests,
                       Intercessors, Schedule, ActivityRecords, Sidebar)
  lib/api.ts           Frontend API client (fetch wrapper, JWT handling,
                       offline/demo-mode fallback)
server/                Express backend
  db.js                SQLite schema + seed data
  auth.js              JWT sign/verify middleware
  index.js              App entry point, mounts routes
  routes/               One file per resource (auth, prayerRequests,
                       intercessors, schedule, activityRecords)
```

## API overview

All routes except `/api/auth/signup` and `/api/auth/login` require a
`Authorization: Bearer <token>` header.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create an account |
| POST | `/api/auth/login` | Log in, returns a JWT |
| GET | `/api/auth/me` | Current user |
| GET | `/api/dashboard/stats` | Aggregate counts for the dashboard |
| GET / POST / PATCH / DELETE | `/api/prayer-requests` | Prayer requests |
| GET / POST / PATCH | `/api/intercessors` | Intercessors |
| GET / POST | `/api/schedule` | Prayer sessions |
| GET / POST | `/api/activity-records` | Session logs |

## "Offline / demo mode"

The frontend is built to still work as a **static, backend-less demo** (this
is what you see if the app is opened as a plain HTML file, e.g. the
published preview link, with no Express server running). If a request to the
API fails to connect, the app falls back to a small built-in dataset and
shows a "Demo data — API not connected" badge. Signing in without a reachable
API creates a local demo session instead of a real one. This only matters
for viewing the UI without running `npm run dev` — for the app to actually
persist data, run the real backend.

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
