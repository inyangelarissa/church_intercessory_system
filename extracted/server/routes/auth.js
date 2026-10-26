import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { signToken, requireAuth, INTERCESSOR_ROLE } from "../auth.js";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PUBLIC_USER = "SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?";

// Public sign-up always creates a regular Intercessor. The Senior Intercessor (admin) account can
// only be created on the server (see SENIOR_* env vars / `npm run create-senior`), never via this route.
router.post("/signup", (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "Name, email and password are required." });
  }
  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail)) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const cleanName = name.trim();
  const cleanPhone = phone?.trim() || "";
  const initials = cleanName.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();
  const password_hash = bcrypt.hashSync(password, 10);

  const userId = db.transaction(() => {
    const info = db.prepare(
      "INSERT INTO users (name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, ?)"
    ).run(cleanName, cleanEmail, cleanPhone || null, INTERCESSOR_ROLE, password_hash);
    const id = Number(info.lastInsertRowid);

    // If the Senior Intercessor already registered this person on the roster, link to that entry.
    const onRoster = db.prepare(
      "SELECT id FROM intercessors WHERE user_id IS NULL AND LOWER(email) = ?"
    ).get(cleanEmail);
    if (onRoster) {
      db.prepare("UPDATE intercessors SET user_id = ? WHERE id = ?").run(id, onRoster.id);
    } else {
      db.prepare(`
        INSERT INTO intercessors (user_id, name, initials, role, phone, email, status, joined_date)
        VALUES (?, ?, ?, 'Intercessor', ?, ?, 'Active', ?)
      `).run(id, cleanName, initials, cleanPhone, cleanEmail,
        new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }));
    }
    return id;
  })();

  const user = db.prepare(PUBLIC_USER).get(userId);
  res.status(201).json({ token: signToken(user), user });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase());
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  const user = db.prepare(PUBLIC_USER).get(row.id);
  res.json({ token: signToken(user), user });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: db.prepare(PUBLIC_USER).get(req.user.id) });
});

export default router;
