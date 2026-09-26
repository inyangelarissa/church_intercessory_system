import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";

const SELECT = `
  SELECT id, session_title AS session, record_date AS date, day_num AS dayNum, month,
         lead_name AS lead, attendees, requests_covered AS requestsCovered, duration,
         outcome, notes, testimonies
  FROM activity_records
  ORDER BY id DESC
`;

const router = Router();

router.get("/", requireAuth, (req, res) => {
  res.json(db.prepare(SELECT).all());
});

router.post("/", requireAuth, (req, res) => {
  const { sessionTitle, leadName, attendees, requestsCovered, duration, outcome, notes, testimonies } = req.body || {};
  if (!sessionTitle?.trim() || !leadName?.trim()) {
    return res.status(400).json({ error: "Session title and lead intercessor are required." });
  }
  const now = new Date();
  const record_date = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const day_num = String(now.getDate()).padStart(2, "0");
  const month = now.toLocaleDateString("en-US", { month: "short" });

  const info = db.prepare(`
    INSERT INTO activity_records (session_title, record_date, day_num, month, lead_name, attendees, requests_covered, duration, outcome, notes, testimonies)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sessionTitle.trim(), record_date, day_num, month, leadName.trim(),
    Number(attendees) || 0, Number(requestsCovered) || 0, duration?.trim() || "1 hr",
    outcome || "Regular", notes?.trim() || "", Number(testimonies) || 0);

  const created = db.prepare(SELECT.replace("ORDER BY id DESC", "WHERE id = ?")).get(info.lastInsertRowid);
  res.status(201).json(created);
});

export default router;
