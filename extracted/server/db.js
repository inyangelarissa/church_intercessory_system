import Database from "better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Where the SQLite file lives.
//  - DATABASE_PATH (recommended in production, e.g. /data/erc_masoro.sqlite3 on a Fly volume)
//  - otherwise ./server/erc_masoro.sqlite3 for local development
//  - on Vercel the filesystem is read-only except /tmp, which is wiped and NOT shared between
//    serverless instances. Accounts created there will "disappear". Do not use Vercel with SQLite.
const onVercel = process.env.VERCEL === "1";
const DB_PATH = process.env.DATABASE_PATH
  || (onVercel ? path.join(os.tmpdir(), "erc_masoro.sqlite3") : path.join(__dirname, "erc_masoro.sqlite3"));

if (onVercel && !process.env.DATABASE_PATH) {
  console.warn("[db] Running on Vercel with a temporary SQLite file. Data (including sign-ups) will be lost between requests. Deploy on a host with a persistent disk (see README).");
}

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
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
`);

const prayerRequestColumns = db.prepare("PRAGMA table_info(prayer_requests)").all().map(column => column.name);
if (!prayerRequestColumns.includes("testimony")) {
  db.exec("ALTER TABLE prayer_requests ADD COLUMN testimony TEXT");
}

// Older versions used the role "Admin" for the church administrator.
db.exec("UPDATE users SET role = 'Senior Intercessor' WHERE role = 'Admin'");
// A request that is "Assigned"/"In Prayer" must have an intercessor; fix any leftovers.
db.exec("UPDATE prayer_requests SET status = 'Open' WHERE assigned_intercessor_id IS NULL AND status IN ('Assigned','In Prayer')");

console.log(`[db] Using SQLite database at ${DB_PATH}`);
