import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireSenior } from "../auth.js";

const router = Router();

// Counts are computed live from prayer_requests so they can never drift out of date.
const SELECT = `
  SELECT i.id, i.name, i.initials, i.role, i.phone, i.email, i.status, i.joined_date AS joinedDate,
         (SELECT COUNT(*) FROM prayer_requests pr WHERE pr.assigned_intercessor_id = i.id AND pr.status != 'Completed') AS assignedRequests,
         (SELECT COUNT(*) FROM prayer_requests pr WHERE pr.assigned_intercessor_id = i.id AND pr.status = 'Completed') AS completedPrayers
  FROM intercessors i
`;

function attachExtras(rows) {
  const specStmt = db.prepare("SELECT specialization FROM intercessor_specializations WHERE intercessor_id = ?");
  const availStmt = db.prepare("SELECT day FROM intercessor_availability WHERE intercessor_id = ?");
  return rows.map(r => ({
    ...r,
    specialization: specStmt.all(r.id).map(s => s.specialization),
    availability: availStmt.all(r.id).map(a => a.day),
  }));
}

const getOne = (id) => attachExtras([db.prepare(`${SELECT} WHERE i.id = ?`).get(id)])[0];

// Everyone signed in can see the roster.
router.get("/", requireAuth, (req, res) => {
  res.json(attachExtras(db.prepare(`${SELECT} ORDER BY i.name`).all()));
});

// Senior Intercessor only: add someone to the roster.
router.post("/", requireAuth, requireSenior, (req, res) => {
  const { name, role, phone, email, specialization, availability } = req.body || {};
  if (!name?.trim() || !role?.trim()) {
    return res.status(400).json({ error: "Name and role are required." });
  }
  const cleanEmail = email?.trim().toLowerCase() || "";
  if (cleanEmail && db.prepare("SELECT id FROM intercessors WHERE LOWER(email) = ?").get(cleanEmail)) {
    return res.status(409).json({ error: "An intercessor with this email is already registered." });
  }
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const joined_date = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
  // If this person already has a login account, link it so they see their assigned requests.
  const account = cleanEmail ? db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail) : null;

  const id = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO intercessors (user_id, name, initials, role, phone, email, status, joined_date)
      VALUES (?, ?, ?, ?, ?, ?, 'Active', ?)
    `).run(account?.id ?? null, name.trim(), initials, role.trim(), phone?.trim() || "", cleanEmail, joined_date);
    const newId = Number(info.lastInsertRowid);
    const insertSpec = db.prepare("INSERT OR IGNORE INTO intercessor_specializations (intercessor_id, specialization) VALUES (?, ?)");
    const insertAvail = db.prepare("INSERT OR IGNORE INTO intercessor_availability (intercessor_id, day) VALUES (?, ?)");
    for (const s of (Array.isArray(specialization) ? specialization : [])) insertSpec.run(newId, s);
    for (const d of (Array.isArray(availability) ? availability : [])) insertAvail.run(newId, d);
    return newId;
  })();

  res.status(201).json(getOne(id));
});

// Senior Intercessor only: mark an intercessor Active / Inactive.
router.patch("/:id", requireAuth, requireSenior, (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare("SELECT id FROM intercessors WHERE id = ?").get(id)) {
    return res.status(404).json({ error: "Intercessor not found." });
  }
  const { status } = req.body || {};
  if (status !== undefined && !["Active", "Inactive"].includes(status)) {
    return res.status(400).json({ error: "Status must be Active or Inactive." });
  }
  if (status) db.prepare("UPDATE intercessors SET status = ? WHERE id = ?").run(status, id);
  res.json(getOne(id));
});

export default router;
