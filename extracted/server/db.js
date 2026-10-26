import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------------------------
// Where the database lives
//  - TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN): hosted libSQL/Turso database. REQUIRED on Vercel,
//    because serverless functions have no persistent disk.
//  - DATABASE_PATH: a local SQLite file (e.g. /data/erc_masoro.sqlite3 on a Fly volume).
//  - otherwise ./server/erc_masoro.sqlite3 for local development.
// ---------------------------------------------------------------------------------------------
const onVercel = Boolean(process.env.VERCEL);

function resolveConfig() {
  if (process.env.TURSO_DATABASE_URL) {
    return { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN || undefined };
  }
  if (onVercel) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Vercel has no persistent disk, so this app needs a hosted database. See README (Deploying to Vercel)."
    );
  }
  const file = process.env.DATABASE_PATH || path.join(__dirname, "erc_masoro.sqlite3");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return { url: `file:${file}` };
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'Congregant',
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS intercessors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  joined_date TEXT NOT NULL,
  assigned_requests INTEGER NOT NULL DEFAULT 0,
  completed_prayers INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS intercessor_specializations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intercessor_id INTEGER NOT NULL REFERENCES intercessors(id) ON DELETE CASCADE,
  specialization TEXT NOT NULL,
  UNIQUE(intercessor_id, specialization)
);

CREATE TABLE IF NOT EXISTS intercessor_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intercessor_id INTEGER NOT NULL REFERENCES intercessors(id) ON DELETE CASCADE,
  day TEXT NOT NULL CHECK (day IN ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  UNIQUE(intercessor_id, day)
);

CREATE TABLE IF NOT EXISTS prayer_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  contact TEXT,
  request TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Urgent','High','Normal')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Assigned','In Prayer','Completed')),
  date TEXT NOT NULL,
  assigned_intercessor_id INTEGER REFERENCES intercessors(id) ON DELETE SET NULL,
  notes TEXT,
  testimony TEXT
);

CREATE TABLE IF NOT EXISTS schedule_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  day TEXT NOT NULL,
  time TEXT NOT NULL,
  duration TEXT NOT NULL,
  lead_intercessor_id INTEGER REFERENCES intercessors(id) ON DELETE SET NULL,
  venue TEXT NOT NULL,
  focus TEXT NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'Weekly'
);

CREATE TABLE IF NOT EXISTS schedule_session_intercessors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES schedule_sessions(id) ON DELETE CASCADE,
  intercessor_id INTEGER NOT NULL REFERENCES intercessors(id) ON DELETE CASCADE,
  UNIQUE(session_id, intercessor_id)
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER REFERENCES schedule_sessions(id) ON DELETE SET NULL,
  session_title TEXT NOT NULL,
  record_date TEXT NOT NULL,
  day_num TEXT NOT NULL,
  month TEXT NOT NULL,
  lead_intercessor_id INTEGER REFERENCES intercessors(id) ON DELETE SET NULL,
  lead_name TEXT NOT NULL,
  attendees INTEGER NOT NULL DEFAULT 0,
  requests_covered INTEGER NOT NULL DEFAULT 0,
  duration TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'Regular' CHECK (outcome IN ('Fruitful','Regular','Incomplete')),
  notes TEXT,
  testimonies INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket ON rate_limits(bucket, ts);
`;

let client = null;
let readyPromise = null;

// Turns a libSQL result row into a plain JSON-safe object.
const toObject = (columns, row) => Object.fromEntries(columns.map((c, i) => [c, row[i]]));

// Query helpers that work on both the client and an open transaction.
function helpers(executor) {
  const exec = (sql, args = []) => executor.execute({ sql, args });
  return {
    /** All rows as plain objects. */
    async all(sql, args = []) {
      const r = await exec(sql, args);
      return r.rows.map(row => toObject(r.columns, row));
    },
    /** First row, or undefined. */
    async get(sql, args = []) {
      const r = await exec(sql, args);
      return r.rows[0] ? toObject(r.columns, r.rows[0]) : undefined;
    },
    /** INSERT / UPDATE / DELETE -> { changes, lastInsertRowid } */
    async run(sql, args = []) {
      const r = await exec(sql, args);
      return {
        changes: r.rowsAffected,
        lastInsertRowid: r.lastInsertRowid === undefined ? null : Number(r.lastInsertRowid),
      };
    },
  };
}

async function init() {
  client = createClient(resolveConfig());
  if (client.protocol === "file") await client.execute("PRAGMA foreign_keys = ON");
  await client.executeMultiple(SCHEMA);

  // Lightweight migrations for databases created by older versions.
  const cols = (await client.execute("PRAGMA table_info(prayer_requests)")).rows.map(r => r.name);
  if (!cols.includes("testimony")) await client.execute("ALTER TABLE prayer_requests ADD COLUMN testimony TEXT");

  // Older versions used the role "Admin" for the church administrator.
  await client.execute("UPDATE users SET role = 'Senior Intercessor' WHERE role = 'Admin'");
  // A request that is "Assigned"/"In Prayer" must have an intercessor; fix any leftovers.
  await client.execute(
    "UPDATE prayer_requests SET status = 'Open' WHERE assigned_intercessor_id IS NULL AND status IN ('Assigned','In Prayer')"
  );
}

/** Resolves once the database is connected and the schema exists. Safe to call on every request. */
export function ready() {
  if (!readyPromise) {
    readyPromise = init().catch(err => {
      readyPromise = null; // allow a retry on the next request instead of failing forever
      throw err;
    });
  }
  return readyPromise;
}

async function base() {
  await ready();
  return helpers(client);
}

export const all = async (sql, args) => (await base()).all(sql, args);
export const get = async (sql, args) => (await base()).get(sql, args);
export const run = async (sql, args) => (await base()).run(sql, args);

/**
 * Run several statements atomically. `fn` receives { all, get, run } bound to the transaction;
 * if it throws, everything is rolled back.
 */
export async function transaction(fn) {
  await ready();
  const tx = await client.transaction("write");
  try {
    const result = await fn(helpers(tx));
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  } finally {
    tx.close();
  }
}

export const databaseDescription = () =>
  process.env.TURSO_DATABASE_URL ? "Turso/libSQL (remote)" : `SQLite file${process.env.DATABASE_PATH ? ` (${process.env.DATABASE_PATH})` : ""}`;
