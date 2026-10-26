import { Router } from "express";
import { all, get, run, transaction } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();

const SELECT = `
  SELECT s.id, s.title, s.day, s.time, s.duration, s.venue, s.focus, s.recurrence,
         COALESCE(i.name, 'Unassigned') AS lead
  FROM schedule_sessions s
  LEFT JOIN intercessors i ON i.id = s.lead_intercessor_id
`;

async function attachTeam(rows) {
  if (rows.length === 0) return rows;
  const ids = rows.map(r => r.id);
  const team = await all(
    `SELECT ssi.session_id, i.name FROM schedule_session_intercessors ssi
     JOIN intercessors i ON i.id = ssi.intercessor_id
     WHERE ssi.session_id IN (${ids.map(() => "?").join(",")})`,
    ids
  );
  return rows.map(r => ({ ...r, intercessors: team.filter(t => t.session_id === r.id).map(t => t.name) }));
}

router.get("/", requireAuth, async (req, res) => {
  res.json(await attachTeam(await all(`${SELECT} ORDER BY s.id`)));
});

router.post("/", requireAuth, async (req, res) => {
  const { title, day, time, duration, venue, focus, recurrence, leadIntercessorId, intercessorIds } = req.body || {};
  if (!title?.trim() || !day?.trim() || !time?.trim()) {
    return res.status(400).json({ error: "Title, day and time are required." });
  }

  const id = await transaction(async tx => {
    const info = await tx.run(
      `INSERT INTO schedule_sessions (title, day, time, duration, lead_intercessor_id, venue, focus, recurrence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title.trim(), day.trim(), time.trim(), duration?.trim() || "1 hr", leadIntercessorId || null,
        venue?.trim() || "Main Sanctuary", focus?.trim() || "General", recurrence?.trim() || "Weekly"]
    );
    for (const iid of (Array.isArray(intercessorIds) ? intercessorIds : [])) {
      await tx.run("INSERT OR IGNORE INTO schedule_session_intercessors (session_id, intercessor_id) VALUES (?, ?)", [info.lastInsertRowid, iid]);
    }
    return info.lastInsertRowid;
  });

  const row = await get(`${SELECT} WHERE s.id = ?`, [id]);
  res.status(201).json((await attachTeam([row]))[0]);
});

export default router;
