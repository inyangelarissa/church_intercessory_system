import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();

const SELECT = `
  SELECT pr.id, pr.name, pr.initials, pr.contact, pr.request, pr.category, pr.priority,
         pr.status, pr.date, pr.notes, pr.testimony,
         COALESCE(i.name, 'Unassigned') AS assigned,
         pr.assigned_intercessor_id AS assignedIntercessorId
  FROM prayer_requests pr
  LEFT JOIN intercessors i ON i.id = pr.assigned_intercessor_id
  ORDER BY pr.id DESC
`;

router.get("/", requireAuth, (req, res) => {
  res.json(db.prepare(SELECT).all());
});

router.post("/", requireAuth, (req, res) => {
  const { name, contact, request, category, priority, notes } = req.body || {};
  if (!name?.trim() || !request?.trim() || !category?.trim()) {
    return res.status(400).json({ error: "Name, request details and category are required." });
  }
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const info = db.prepare(`
    INSERT INTO prayer_requests (name, initials, contact, request, category, priority, status, date, notes)
    VALUES (?, ?, ?, ?, ?, ?, 'Open', ?, ?)
  `).run(name.trim(), initials, contact?.trim() || "", request.trim(), category.trim(), priority || "Normal", date, notes?.trim() || "");

  const created = db.prepare(SELECT.replace("ORDER BY pr.id DESC", "WHERE pr.id = ?")).get(info.lastInsertRowid);
  res.status(201).json(created);
});

router.patch("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM prayer_requests WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Prayer request not found." });

  const { status, priority, notes, testimony, assignedIntercessorId } = req.body || {};
  if (status && !["Open", "Assigned", "In Prayer", "Completed"].includes(status)) {
    return res.status(400).json({ error: "Invalid prayer request status." });
  }
  const nextStatus = status ?? existing.status;
  const nextTestimony = testimony === undefined ? existing.testimony : testimony?.trim();
  if (nextStatus === "Completed" && !nextTestimony) {
    return res.status(400).json({ error: "A testimony is required before completing a prayer request." });
  }
  const nextAssignedIntercessorId = assignedIntercessorId === undefined
    ? existing.assigned_intercessor_id
    : assignedIntercessorId;
  db.prepare(`
    UPDATE prayer_requests
    SET status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        notes = COALESCE(?, notes),
        testimony = ?,
        assigned_intercessor_id = ?
    WHERE id = ?
  `).run(status ?? null, priority ?? null, notes ?? null, nextTestimony || null, nextAssignedIntercessorId, id);
  const updated = db.prepare(SELECT.replace("ORDER BY pr.id DESC", "WHERE pr.id = ?")).get(id);
  res.json(updated);
});

router.delete("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM prayer_requests WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Prayer request not found." });
  res.status(204).end();
});

export default router;
