import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { signToken, requireAuth } from "../auth.js";

const router = Router();

router.post("/signup", (req, res) => {
  const { name, email, phone, role, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "Name, email and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    "INSERT INTO users (name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, ?)"
  ).run(name.trim(), email.trim().toLowerCase(), phone?.trim() || null, role || "Intercessor", password_hash);

  const userId = Number(info.lastInsertRowid);
  const initials = name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();
  db.prepare(`
    INSERT INTO intercessors (user_id, name, initials, role, phone, email, status, joined_date)
    VALUES (?, ?, ?, ?, ?, ?, 'Active', datetime('now'))
  `).run(userId, name.trim(), initials, "Intercessor", phone?.trim() || "", email.trim().toLowerCase());

  const user = db.prepare("SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?").get(userId);
  const token = signToken(user);
  res.status(201).json({ token, user });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const safeUser = { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, created_at: user.created_at };
  const token = signToken(safeUser);
  res.json({ token, user: safeUser });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?").get(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user });
});

export default router;
