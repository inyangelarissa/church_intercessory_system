import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "erc_masoro.sqlite3");

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

// ---- Seed only a brand-new database; an intentional empty intercessor table must stay empty. ----
const alreadyInitialized = db.prepare("SELECT COUNT(*) AS c FROM users").get().c > 0
  || db.prepare("SELECT COUNT(*) AS c FROM intercessors").get().c > 0;

if (!alreadyInitialized) {
  const seed = db.transaction(() => {
    const insertIntercessor = db.prepare(`
      INSERT INTO intercessors (name, initials, role, phone, email, status, joined_date, assigned_requests, completed_prayers)
      VALUES (@name, @initials, @role, @phone, @email, @status, @joined_date, @assigned_requests, @completed_prayers)
    `);
    const insertSpec = db.prepare(`INSERT INTO intercessor_specializations (intercessor_id, specialization) VALUES (?, ?)`);
    const insertAvail = db.prepare(`INSERT INTO intercessor_availability (intercessor_id, day) VALUES (?, ?)`);

    const intercessorSeed = [
      { name: "Sr. Mary Wanjiku", initials: "MW", role: "Senior Intercessor", phone: "+250 788 111222", email: "m.wanjiku@ercmasoro.org", status: "Active", joined_date: "Mar 2019", assigned_requests: 12, completed_prayers: 234, spec: ["Healing", "Deliverance"], avail: ["Mon", "Wed", "Fri", "Sat"] },
      { name: "Br. James Mwangi", initials: "JM", role: "Intercessor", phone: "+250 788 222333", email: "j.mwangi@ercmasoro.org", status: "Active", joined_date: "Jun 2020", assigned_requests: 8, completed_prayers: 187, spec: ["Guidance", "Family"], avail: ["Tue", "Thu", "Sat"] },
      { name: "Pastor John Kariuki", initials: "JK", role: "Prayer Leader", phone: "+250 788 333444", email: "j.kariuki@ercmasoro.org", status: "Active", joined_date: "Jan 2017", assigned_requests: 15, completed_prayers: 412, spec: ["Salvation", "Mental Health", "Healing"], avail: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
      { name: "Sr. Ruth Achieng", initials: "RA", role: "Intercessor", phone: "+250 788 444555", email: "r.achieng@ercmasoro.org", status: "Active", joined_date: "Sep 2021", assigned_requests: 9, completed_prayers: 156, spec: ["Finances", "Business"], avail: ["Wed", "Fri", "Sun"] },
      { name: "Deacon Paul Njeru", initials: "PN", role: "Deacon / Intercessor", phone: "+250 788 555666", email: "p.njeru@ercmasoro.org", status: "Active", joined_date: "Feb 2022", assigned_requests: 6, completed_prayers: 98, spec: ["Family", "Marriage"], avail: ["Tue", "Thu", "Sun"] },
      { name: "Sr. Esther Macharia", initials: "EM", role: "Intercessor", phone: "+250 788 666777", email: "e.macharia@ercmasoro.org", status: "Inactive", joined_date: "Nov 2022", assigned_requests: 0, completed_prayers: 63, spec: ["Pregnancy", "Children"], avail: [] },
      { name: "Br. Isaac Korir", initials: "IK", role: "Junior Intercessor", phone: "+250 788 777888", email: "i.korir@ercmasoro.org", status: "Active", joined_date: "Jan 2024", assigned_requests: 4, completed_prayers: 44, spec: ["Salvation", "Youth"], avail: ["Mon", "Wed", "Sat"] },
      { name: "Sr. Hannah Otieno", initials: "HO", role: "Intercessor", phone: "+250 788 888999", email: "h.otieno@ercmasoro.org", status: "Active", joined_date: "Jul 2023", assigned_requests: 7, completed_prayers: 121, spec: ["Healing", "Pregnancy"], avail: ["Mon", "Fri", "Sun"] },
    ];

    const idByName = {};
    for (const it of intercessorSeed) {
      const info = insertIntercessor.run(it);
      idByName[it.name] = info.lastInsertRowid;
      for (const s of it.spec) insertSpec.run(info.lastInsertRowid, s);
      for (const d of it.avail) insertAvail.run(info.lastInsertRowid, d);
    }

    const insertRequest = db.prepare(`
      INSERT INTO prayer_requests (name, initials, contact, request, category, priority, status, date, assigned_intercessor_id, notes)
      VALUES (@name, @initials, @contact, @request, @category, @priority, @status, @date, @assigned_intercessor_id, @notes)
    `);
    const requestSeed = [
      { name: "Agnes Kamau", initials: "AK", contact: "+250 788 345678", request: "Healing for my mother diagnosed with stage 3 cancer. The doctors have given little hope.", category: "Healing", priority: "Urgent", status: "Assigned", date: "Sep 15, 2026", assigned: "Sr. Mary Wanjiku", notes: "Family needs regular check-in" },
      { name: "David Omondi", initials: "DO", contact: "+250 788 456789", request: "Divine guidance for major career decision — offered two positions in different cities.", category: "Guidance", priority: "High", status: "In Prayer", date: "Sep 14, 2026", assigned: "Br. James Mwangi", notes: "Decision due by end of month" },
      { name: "Grace Njoki", initials: "GN", contact: "+250 788 567890", request: "Prayer for family reconciliation after a long estrangement with her brother.", category: "Family", priority: "Normal", status: "Open", date: "Sep 14, 2026", assigned: null, notes: "" },
      { name: "Peter Mutua", initials: "PM", contact: "+250 788 678901", request: "Business breakthrough and divine favor for the new enterprise launched last month.", category: "Finances", priority: "Normal", status: "Assigned", date: "Sep 13, 2026", assigned: "Sr. Ruth Achieng", notes: "" },
      { name: "Faith Wambua", initials: "FW", contact: "+250 788 789012", request: "Deliverance from depression and anxiety. Has been struggling for over a year.", category: "Mental Health", priority: "High", status: "In Prayer", date: "Sep 12, 2026", assigned: "Pastor John Kariuki", notes: "Referred to counseling" },
      { name: "Samuel Kiprotich", initials: "SK", contact: "+250 788 890123", request: "Prayers for safe delivery for wife expecting twins in October.", category: "Pregnancy", priority: "High", status: "Open", date: "Sep 11, 2026", assigned: null, notes: "" },
      { name: "Esther Ndungu", initials: "EN", contact: "+250 788 901234", request: "Salvation for my husband who is not a believer. Been praying for 5 years.", category: "Salvation", priority: "Normal", status: "Completed", date: "Sep 10, 2026", assigned: "Sr. Mary Wanjiku", notes: "Follow up scheduled" },
      { name: "Joseph Otieno", initials: "JO", contact: "+250 788 012345", request: "Recovery from accident injuries — currently hospitalized.", category: "Healing", priority: "Urgent", status: "In Prayer", date: "Sep 9, 2026", assigned: "Br. James Mwangi", notes: "Hospital visits being arranged" },
    ];
    for (const r of requestSeed) {
      insertRequest.run({
        name: r.name, initials: r.initials, contact: r.contact, request: r.request,
        category: r.category, priority: r.priority, status: r.status, date: r.date,
        assigned_intercessor_id: r.assigned ? idByName[r.assigned] : null, notes: r.notes,
      });
    }

    const insertSession = db.prepare(`
      INSERT INTO schedule_sessions (title, day, time, duration, lead_intercessor_id, venue, focus, recurrence)
      VALUES (@title, @day, @time, @duration, @lead_intercessor_id, @venue, @focus, @recurrence)
    `);
    const insertSessionIntercessor = db.prepare(`INSERT OR IGNORE INTO schedule_session_intercessors (session_id, intercessor_id) VALUES (?, ?)`);
    const allNames = intercessorSeed.map(i => i.name);
    const sessionSeed = [
      { title: "Early Morning Intercession", day: "Monday", time: "5:00 AM", duration: "2 hrs", lead: "Sr. Mary Wanjiku", venue: "Main Sanctuary", focus: "National & Government", team: ["Sr. Mary Wanjiku", "Br. Isaac Korir", "Sr. Hannah Otieno", "Br. James Mwangi"], recurrence: "Weekly" },
      { title: "Healing Prayer Watch", day: "Tuesday", time: "6:30 PM", duration: "1.5 hrs", lead: "Pastor John Kariuki", venue: "Prayer Room A", focus: "Healing & Deliverance", team: ["Pastor John Kariuki", "Sr. Ruth Achieng", "Deacon Paul Njeru"], recurrence: "Weekly" },
      { title: "Midday Intercession", day: "Wednesday", time: "12:00 PM", duration: "1 hr", lead: "Br. James Mwangi", venue: "Prayer Room B", focus: "Congregation Requests", team: ["Br. James Mwangi", "Sr. Esther Macharia"], recurrence: "Weekly" },
      { title: "Family Prayer Circle", day: "Thursday", time: "7:00 PM", duration: "1.5 hrs", lead: "Deacon Paul Njeru", venue: "Fellowship Hall", focus: "Families & Marriages", team: ["Deacon Paul Njeru", "Sr. Mary Wanjiku", "Sr. Hannah Otieno"], recurrence: "Weekly" },
      { title: "Evangelism Intercession", day: "Friday", time: "6:00 AM", duration: "1 hr", lead: "Sr. Ruth Achieng", venue: "Prayer Room A", focus: "Salvation & Missions", team: ["Sr. Ruth Achieng", "Br. Isaac Korir"], recurrence: "Weekly" },
      { title: "Saturday Prayer Warriors", day: "Saturday", time: "7:00 AM", duration: "3 hrs", lead: "Pastor John Kariuki", venue: "Main Sanctuary", focus: "Warfare & Breakthrough", team: ["Pastor John Kariuki", "Sr. Mary Wanjiku", "Br. James Mwangi", "Deacon Paul Njeru", "Sr. Hannah Otieno"], recurrence: "Weekly" },
      { title: "All-Night Vigil", day: "Saturday", time: "10:00 PM", duration: "8 hrs", lead: "Sr. Mary Wanjiku", venue: "Main Sanctuary", focus: "Corporate Intercession", team: allNames, recurrence: "Monthly (Last Sat)" },
      { title: "Sunday Pre-Service Prayer", day: "Sunday", time: "7:30 AM", duration: "1 hr", lead: "Pastor John Kariuki", venue: "Prayer Room B", focus: "Sunday Service Covering", team: ["Pastor John Kariuki", "Sr. Ruth Achieng", "Br. James Mwangi", "Deacon Paul Njeru"], recurrence: "Weekly" },
    ];
    const sessionIdByTitle = {};
    for (const s of sessionSeed) {
      const info = insertSession.run({
        title: s.title, day: s.day, time: s.time, duration: s.duration,
        lead_intercessor_id: idByName[s.lead], venue: s.venue, focus: s.focus, recurrence: s.recurrence,
      });
      sessionIdByTitle[s.title] = info.lastInsertRowid;
      for (const n of s.team) insertSessionIntercessor.run(info.lastInsertRowid, idByName[n]);
    }

    const insertRecord = db.prepare(`
      INSERT INTO activity_records (session_id, session_title, record_date, day_num, month, lead_intercessor_id, lead_name, attendees, requests_covered, duration, outcome, notes, testimonies)
      VALUES (@session_id, @session_title, @record_date, @day_num, @month, @lead_intercessor_id, @lead_name, @attendees, @requests_covered, @duration, @outcome, @notes, @testimonies)
    `);
    const recordSeed = [
      { session: "All-Night Vigil", date: "Aug 31, 2026", dayNum: "31", month: "Aug", lead: "Sr. Mary Wanjiku", attendees: 22, requestsCovered: 45, duration: "8 hrs", outcome: "Fruitful", notes: "Strong presence felt. Many testimonies of breakthrough during the watch.", testimonies: 7 },
      { session: "Saturday Prayer Warriors", date: "Sep 6, 2026", dayNum: "06", month: "Sep", lead: "Pastor John Kariuki", attendees: 18, requestsCovered: 28, duration: "3 hrs", outcome: "Fruitful", notes: "Focused on healing requests. Three immediate testimonies.", testimonies: 3 },
      { session: "Early Morning Intercession", date: "Sep 8, 2026", dayNum: "08", month: "Sep", lead: "Sr. Mary Wanjiku", attendees: 7, requestsCovered: 12, duration: "2 hrs", outcome: "Regular", notes: "Steady intercession. Covered national matters and congregational requests.", testimonies: 0 },
      { session: "Midday Intercession", date: "Sep 10, 2026", dayNum: "10", month: "Sep", lead: "Br. James Mwangi", attendees: 4, requestsCovered: 8, duration: "1 hr", outcome: "Regular", notes: "Good session despite low attendance due to public holiday.", testimonies: 0 },
      { session: "Healing Prayer Watch", date: "Sep 9, 2026", dayNum: "09", month: "Sep", lead: "Pastor John Kariuki", attendees: 11, requestsCovered: 20, duration: "1.5 hrs", outcome: "Fruitful", notes: "Received word of healing for Sr. Hannah's back pain. Family of Joseph Otieno reported improvement.", testimonies: 2 },
      { session: "Family Prayer Circle", date: "Sep 11, 2026", dayNum: "11", month: "Sep", lead: "Deacon Paul Njeru", attendees: 9, requestsCovered: 15, duration: "1.5 hrs", outcome: "Regular", notes: "Covered 15 family-related requests. Session was peaceful and orderly.", testimonies: 1 },
      { session: "Early Morning Intercession", date: "Sep 15, 2026", dayNum: "15", month: "Sep", lead: "Sr. Mary Wanjiku", attendees: 5, requestsCovered: 10, duration: "1 hr", outcome: "Incomplete", notes: "Session cut short due to power outage. Resumed briefly outdoors.", testimonies: 0 },
      { session: "Saturday Prayer Warriors", date: "Sep 13, 2026", dayNum: "13", month: "Sep", lead: "Pastor John Kariuki", attendees: 20, requestsCovered: 35, duration: "3 hrs", outcome: "Fruitful", notes: "Best session this month. Covered urgent requests. Several intercessors reported confirmations.", testimonies: 5 },
    ];
    for (const r of recordSeed) {
      insertRecord.run({
        session_id: sessionIdByTitle[r.session] || null, session_title: r.session,
        record_date: r.date, day_num: r.dayNum, month: r.month,
        lead_intercessor_id: idByName[r.lead] || null, lead_name: r.lead,
        attendees: r.attendees, requests_covered: r.requestsCovered, duration: r.duration,
        outcome: r.outcome, notes: r.notes, testimonies: r.testimonies,
      });
    }

    // Demo login accounts (password: "ercmasoro2026")
    const insertUser = db.prepare(`INSERT INTO users (name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, ?)`);
    const hash = bcrypt.hashSync("ercmasoro2026", 10);
    insertUser.run("Pastor Admin", "admin@ercmasoro.org", "+250 788 000001", "Admin", hash);
    insertUser.run("Sr. Mary Wanjiku", "m.wanjiku@ercmasoro.org", "+250 788 111222", "Intercessor", hash);
  });

  seed();
  console.log("Database seeded with initial ERC Masoro data.");
}
