import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();

function attachExtras(rows) {
  const specStmt = db.prepare("SELECT specialization FROM intercessor_specializations WHERE intercessor_id = ?");
  const availStmt = db.prepare("SELECT day FROM intercessor_availability WHERE intercessor_id = ?");
  return rows.map(r => ({
    ...r,
    specialization: specStmt.all(r.id).map(s => s.specialization),
    availability: availStmt.all(r.id).map(a => a.day),
  }));
}

router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT id, name, initials, role, phone, email, status, joined_date AS joinedDate,
           assigned_requests AS assignedRequests, completed_prayers AS completedPrayers
    FROM intercessors
    WHERE user_id IS NOT NULL
    ORDER BY name
  `).all();
  res.json(attachExtras(rows));
});

router.post("/", requireAuth, (req, res) => {
  const { name, role, phone, email, specialization, availability } = req.body || {};
  if (!name?.trim() || !role?.trim()) {
    return res.status(400).json({ error: "Name and role are required." });
  }
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const joined_date = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });

  const info = db.prepare(`
    INSERT INTO intercessors (name, initials, role, phone, email, status, joined_date)
    VALUES (?, ?, ?, ?, ?, 'Active', ?)
  `).run(name.trim(), initials, role.trim(), phone?.trim() || "", email?.trim() || "", joined_date);

  const id = info.lastInsertRowid;
  const insertSpec = db.prepare("INSERT INTO intercessor_specializations (intercessor_id, specialization) VALUES (?, ?)");
  const insertAvail = db.prepare("INSERT INTO intercessor_availability (intercessor_id, day) VALUES (?, ?)");
  for (const s of (Array.isArray(specialization) ? specialization : [])) insertSpec.run(id, s);
  for (const d of (Array.isArray(availability) ? availability : [])) insertAvail.run(id, d);

  const row = db.prepare(`
    SELECT id, name, initials, role, phone, email, status, joined_date AS joinedDate,
           assigned_requests AS assignedRequests, completed_prayers AS completedPrayers
    FROM intercessors WHERE id = ?
  `).get(id);
  res.status(201).json(attachExtras([row])[0]);
});

router.patch("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT id FROM intercessors WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Intercessor not found." });

  const { status } = req.body || {};
  if (status && !["Active", "Inactive"].includes(status)) {
    return res.status(400).json({ error: "Status must be Active or Inactive." });
  }
  if (status) db.prepare("UPDATE intercessors SET status = ? WHERE id = ?").run(status, id);

  const row = db.prepare(`
    SELECT id, name, initials, role, phone, email, status, joined_date AS joinedDate,
           assigned_requests AS assignedRequests, completed_prayers AS completedPrayers
    FROM intercessors WHERE id = ?
  `).get(id);
  res.json(attachExtras([row])[0]);
});

export default router;
