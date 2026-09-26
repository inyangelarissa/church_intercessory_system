import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();

function attachTeam(rows) {
  const teamStmt = db.prepare(`
    SELECT i.name FROM schedule_session_intercessors ssi
    JOIN intercessors i ON i.id = ssi.intercessor_id
    WHERE ssi.session_id = ?
  `);
  return rows.map(r => ({ ...r, intercessors: teamStmt.all(r.id).map(t => t.name) }));
}

router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT s.id, s.title, s.day, s.time, s.duration, s.venue, s.focus, s.recurrence,
           COALESCE(i.name, 'Unassigned') AS lead
    FROM schedule_sessions s
    LEFT JOIN intercessors i ON i.id = s.lead_intercessor_id
    ORDER BY s.id
  `).all();
  res.json(attachTeam(rows));
});

router.post("/", requireAuth, (req, res) => {
  const { title, day, time, duration, venue, focus, recurrence, leadIntercessorId, intercessorIds } = req.body || {};
  if (!title?.trim() || !day?.trim() || !time?.trim()) {
    return res.status(400).json({ error: "Title, day and time are required." });
  }

  const info = db.prepare(`
    INSERT INTO schedule_sessions (title, day, time, duration, lead_intercessor_id, venue, focus, recurrence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title.trim(), day.trim(), time.trim(), duration?.trim() || "1 hr", leadIntercessorId || null,
    venue?.trim() || "Main Sanctuary", focus?.trim() || "General", recurrence?.trim() || "Weekly");

  const id = info.lastInsertRowid;
  const insertTeam = db.prepare("INSERT OR IGNORE INTO schedule_session_intercessors (session_id, intercessor_id) VALUES (?, ?)");
  for (const iid of (Array.isArray(intercessorIds) ? intercessorIds : [])) insertTeam.run(id, iid);

  const row = db.prepare(`
    SELECT s.id, s.title, s.day, s.time, s.duration, s.venue, s.focus, s.recurrence,
           COALESCE(i.name, 'Unassigned') AS lead
    FROM schedule_sessions s LEFT JOIN intercessors i ON i.id = s.lead_intercessor_id
    WHERE s.id = ?
  `).get(id);
  res.status(201).json(attachTeam([row])[0]);
});

export default router;
