import { Router } from "express";
import { all, get, run, transaction } from "../db.js";
import { requireAuth, requireSenior } from "../auth.js";

const router = Router();

// Counts are computed live from prayer_requests so they can never drift out of date.
const SELECT = `
  SELECT i.id, i.name, i.initials, i.role, i.phone, i.email, i.status, i.joined_date AS joinedDate,
         (SELECT COUNT(*) FROM prayer_requests pr WHERE pr.assigned_intercessor_id = i.id AND pr.status != 'Completed') AS assignedRequests,
         (SELECT COUNT(*) FROM prayer_requests pr WHERE pr.assigned_intercessor_id = i.id AND pr.status = 'Completed') AS completedPrayers
  FROM intercessors i
`;

// Two queries for the whole list instead of two per person (each query is a network round trip).
async function attachExtras(rows) {
  if (rows.length === 0) return rows;
  const ids = rows.map(r => r.id);
  const marks = ids.map(() => "?").join(",");
  const specs = await all(`SELECT intercessor_id, specialization FROM intercessor_specializations WHERE intercessor_id IN (${marks})`, ids);
  const days = await all(`SELECT intercessor_id, day FROM intercessor_availability WHERE intercessor_id IN (${marks})`, ids);
  return rows.map(r => ({
    ...r,
    specialization: specs.filter(s => s.intercessor_id === r.id).map(s => s.specialization),
    availability: days.filter(d => d.intercessor_id === r.id).map(d => d.day),
  }));
}

const getOne = async (id) => {
  const row = await get(`${SELECT} WHERE i.id = ?`, [id]);
  return row ? (await attachExtras([row]))[0] : undefined;
};

// Everyone signed in can see the roster.
router.get("/", requireAuth, async (req, res) => {
  res.json(await attachExtras(await all(`${SELECT} ORDER BY i.name`)));
});

// Senior Intercessor only: add someone to the roster.
router.post("/", requireAuth, requireSenior, async (req, res) => {
  const { name, role, phone, email, specialization, availability } = req.body || {};
  if (!name?.trim() || !role?.trim()) {
    return res.status(400).json({ error: "Name and role are required." });
  }
  const cleanEmail = email?.trim().toLowerCase() || "";
  if (cleanEmail && await get("SELECT id FROM intercessors WHERE LOWER(email) = ?", [cleanEmail])) {
    return res.status(409).json({ error: "An intercessor with this email is already registered." });
  }
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const joined_date = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
  // If this person already has a login account, link it so they see their assigned requests.
  const account = cleanEmail ? await get("SELECT id FROM users WHERE email = ?", [cleanEmail]) : null;

  const id = await transaction(async tx => {
    const info = await tx.run(
      `INSERT INTO intercessors (user_id, name, initials, role, phone, email, status, joined_date)
       VALUES (?, ?, ?, ?, ?, ?, 'Active', ?)`,
      [account?.id ?? null, name.trim(), initials, role.trim(), phone?.trim() || "", cleanEmail, joined_date]
    );
    const newId = info.lastInsertRowid;
    for (const s of (Array.isArray(specialization) ? specialization : [])) {
      await tx.run("INSERT OR IGNORE INTO intercessor_specializations (intercessor_id, specialization) VALUES (?, ?)", [newId, String(s)]);
    }
    for (const d of (Array.isArray(availability) ? availability : [])) {
      await tx.run("INSERT OR IGNORE INTO intercessor_availability (intercessor_id, day) VALUES (?, ?)", [newId, String(d)]);
    }
    return newId;
  });

  res.status(201).json(await getOne(id));
});

// Senior Intercessor only: mark an intercessor Active / Inactive.
router.patch("/:id", requireAuth, requireSenior, async (req, res) => {
  const id = Number(req.params.id);
  if (!await get("SELECT id FROM intercessors WHERE id = ?", [id])) {
    return res.status(404).json({ error: "Intercessor not found." });
  }
  const { status } = req.body || {};
  if (status !== undefined && !["Active", "Inactive"].includes(status)) {
    return res.status(400).json({ error: "Status must be Active or Inactive." });
  }
  if (status) await run("UPDATE intercessors SET status = ? WHERE id = ?", [status, id]);
  res.json(await getOne(id));
});

export default router;
