import { Router } from "express";
import { all, get, run } from "../db.js";
import { requireAuth, requireSenior, isSenior, intercessorIdForUser } from "../auth.js";
import { checkEmail, checkPhone, checkContact } from "../validation.js";

const router = Router();

const STATUSES = ["Open", "Assigned", "In Prayer", "Completed"];
const PRIORITIES = ["Urgent", "High", "Normal"];
const CATEGORIES = ["Healing", "Guidance", "Family", "Finances", "Mental Health", "Pregnancy", "Salvation", "Other"];

const SELECT = `
  SELECT pr.id, pr.name, pr.initials, pr.contact, pr.request, pr.category, pr.priority,
         pr.status, pr.date, pr.notes, pr.testimony,
         COALESCE(i.name, 'Unassigned') AS assigned,
         pr.assigned_intercessor_id AS assignedIntercessorId
  FROM prayer_requests pr
  LEFT JOIN intercessors i ON i.id = pr.assigned_intercessor_id
`;

const getOne = (id) => get(`${SELECT} WHERE pr.id = ?`, [id]);
const today = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const initialsOf = (name) => name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();

// ---- Public: congregants submit a request from the home page (no login) ----
// Stored in the database (not in memory) because serverless instances do not share memory.
async function publicRateLimit(req, res, next) {
  const windowMs = 60 * 60 * 1000;
  const max = 10;
  const now = Date.now();
  const bucket = `public-prayer:${req.ip}`;
  await run("DELETE FROM rate_limits WHERE ts < ?", [now - windowMs]);
  const { c } = await get("SELECT COUNT(*) AS c FROM rate_limits WHERE bucket = ?", [bucket]);
  if (c >= max) {
    return res.status(429).json({ error: "Too many requests from this connection. Please try again later." });
  }
  await run("INSERT INTO rate_limits (bucket, ts) VALUES (?, ?)", [bucket, now]);
  next();
}

router.post("/public", publicRateLimit, async (req, res) => {
  const { name, contact, email, category, request, anonymous } = req.body || {};
  const text = typeof request === "string" ? request.trim() : "";
  if (!text) return res.status(400).json({ error: "Please describe your prayer need." });
  if (text.length > 1000) return res.status(400).json({ error: "Your prayer request is too long (1000 characters maximum)." });

  const isAnonymous = anonymous === true;
  const cleanName = isAnonymous ? "Anonymous" : (typeof name === "string" ? name.trim().slice(0, 100) : "");
  if (!cleanName) return res.status(400).json({ error: "Please enter your name or submit anonymously." });

  const cleanCategory = CATEGORIES.includes(category) ? category : "Other";
  // Phone and email are optional, but when given they must be valid (anonymous requests keep neither).
  let cleanContact = "";
  if (!isAnonymous) {
    const phoneCheck = checkPhone(contact);
    if (!phoneCheck.ok) return res.status(400).json({ error: phoneCheck.error });
    const emailCheck = checkEmail(email, { required: false });
    if (!emailCheck.ok) return res.status(400).json({ error: emailCheck.error });
    cleanContact = [phoneCheck.value, emailCheck.value].filter(Boolean).join(" · ");
  }

  await run(
    `INSERT INTO prayer_requests (name, initials, contact, request, category, priority, status, date, notes)
     VALUES (?, ?, ?, ?, ?, 'Normal', 'Open', ?, '')`,
    [cleanName, isAnonymous ? "AN" : initialsOf(cleanName), cleanContact, text, cleanCategory, today()]
  );

  // Deliberately no request data in the response: this endpoint is unauthenticated.
  res.status(201).json({ ok: true });
});

// ---- Authenticated ----

// Senior Intercessor: every request. Intercessor: only the ones assigned to them.
router.get("/", requireAuth, async (req, res) => {
  if (isSenior(req.user)) {
    return res.json(await all(`${SELECT} ORDER BY pr.id DESC`));
  }
  const myId = await intercessorIdForUser(req.user.id);
  if (myId === null) return res.json([]);
  res.json(await all(`${SELECT} WHERE pr.assigned_intercessor_id = ? ORDER BY pr.id DESC`, [myId]));
});

// Senior Intercessor records a request on someone's behalf (e.g. told in person).
router.post("/", requireAuth, requireSenior, async (req, res) => {
  const { name, contact, request, category, priority, notes } = req.body || {};
  if (!name?.trim() || !request?.trim() || !category?.trim()) {
    return res.status(400).json({ error: "Name, request details and category are required." });
  }
  const contactCheck = checkContact(contact);
  if (!contactCheck.ok) return res.status(400).json({ error: contactCheck.error });
  const info = await run(
    `INSERT INTO prayer_requests (name, initials, contact, request, category, priority, status, date, notes)
     VALUES (?, ?, ?, ?, ?, ?, 'Open', ?, ?)`,
    [name.trim(), initialsOf(name), contactCheck.value, request.trim(), category.trim(),
      PRIORITIES.includes(priority) ? priority : "Normal", today(), notes?.trim() || ""]
  );
  res.status(201).json(await getOne(info.lastInsertRowid));
});

router.patch("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await get("SELECT * FROM prayer_requests WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Prayer request not found." });

  const senior = isSenior(req.user);
  const { status, priority, notes, testimony, assignedIntercessorId } = req.body || {};

  if (!senior) {
    // An intercessor may only work on a request that is assigned to them, and may only record progress.
    const myId = await intercessorIdForUser(req.user.id);
    if (myId === null || existing.assigned_intercessor_id !== myId) {
      return res.status(404).json({ error: "Prayer request not found." });
    }
    if (assignedIntercessorId !== undefined) {
      return res.status(403).json({ error: "Only the Senior Intercessor can assign prayer requests." });
    }
    if (priority !== undefined) {
      return res.status(403).json({ error: "Only the Senior Intercessor can change priority." });
    }
    if (status !== undefined && !["Assigned", "In Prayer", "Completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid prayer request status." });
    }
  }

  if (status !== undefined && !STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid prayer request status." });
  }
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: "Invalid priority." });
  }

  // Assignment (Senior Intercessor only)
  let nextAssigned = existing.assigned_intercessor_id;
  if (assignedIntercessorId !== undefined) {
    if (assignedIntercessorId === null) {
      nextAssigned = null;
    } else {
      const target = await get("SELECT id, status FROM intercessors WHERE id = ?", [Number(assignedIntercessorId)]);
      if (!target) return res.status(404).json({ error: "Intercessor not found." });
      if (target.status !== "Active") return res.status(400).json({ error: "Only active intercessors can be assigned." });
      nextAssigned = target.id;
    }
  }

  let nextStatus = status ?? existing.status;
  if (nextAssigned !== null && nextStatus === "Open") nextStatus = "Assigned";
  if (nextAssigned === null && (nextStatus === "Assigned" || nextStatus === "In Prayer")) nextStatus = "Open";

  const nextTestimony = testimony === undefined ? existing.testimony : (typeof testimony === "string" ? testimony.trim() : null);
  if (nextStatus === "Completed" && !nextTestimony) {
    return res.status(400).json({ error: "A testimony is required before completing a prayer request." });
  }

  await run(
    `UPDATE prayer_requests
     SET status = ?, priority = ?, notes = ?, testimony = ?, assigned_intercessor_id = ?
     WHERE id = ?`,
    [nextStatus, priority ?? existing.priority, notes === undefined ? existing.notes : String(notes),
      nextTestimony || null, nextAssigned, id]
  );

  res.json(await getOne(id));
});

router.delete("/:id", requireAuth, requireSenior, async (req, res) => {
  const info = await run("DELETE FROM prayer_requests WHERE id = ?", [Number(req.params.id)]);
  if (info.changes === 0) return res.status(404).json({ error: "Prayer request not found." });
  res.status(204).end();
});

export default router;
