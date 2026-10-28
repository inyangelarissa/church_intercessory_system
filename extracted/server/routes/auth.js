import { Router } from "express";
import bcrypt from "bcryptjs";
import { get, transaction } from "../db.js";
import { signToken, requireAuth, INTERCESSOR_ROLE, SENIOR_ROLE } from "../auth.js";
import { checkEmail, checkPhone } from "../validation.js";

const router = Router();

const PUBLIC_USER = "SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?";

router.post("/signup", async (req, res) => {
  const { name, email, phone, role, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "Name, email and password are required." });
  }
  const emailCheck = checkEmail(email);
  if (!emailCheck.ok) return res.status(400).json({ error: emailCheck.error });
  const phoneCheck = checkPhone(phone);
  if (!phoneCheck.ok) return res.status(400).json({ error: phoneCheck.error });
  const cleanEmail = emailCheck.value;
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  if (role && ![INTERCESSOR_ROLE, SENIOR_ROLE].includes(role)) {
    return res.status(400).json({ error: "Please choose Intercessor or Senior Intercessor." });
  }
  const selectedRole = role || INTERCESSOR_ROLE;
  if (await get("SELECT id FROM users WHERE email = ?", [cleanEmail])) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const cleanName = name.trim();
  const cleanPhone = phoneCheck.value;
  const initials = cleanName.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();
  const password_hash = bcrypt.hashSync(String(password), 10);

  let userId;
  try {
    userId = await transaction(async tx => {
      const info = await tx.run(
        "INSERT INTO users (name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, ?)",
        [cleanName, cleanEmail, cleanPhone || null, selectedRole, password_hash]
      );
      const id = info.lastInsertRowid;

      if (selectedRole === INTERCESSOR_ROLE) {
        // If the Senior Intercessor already registered this person on the roster, link to that entry.
        const onRoster = await tx.get(
          "SELECT id FROM intercessors WHERE user_id IS NULL AND LOWER(email) = ?", [cleanEmail]
        );
        if (onRoster) {
          await tx.run("UPDATE intercessors SET user_id = ? WHERE id = ?", [id, onRoster.id]);
        } else {
          await tx.run(
            `INSERT INTO intercessors (user_id, name, initials, role, phone, email, status, joined_date)
             VALUES (?, ?, ?, 'Intercessor', ?, ?, 'Active', ?)`,
            [id, cleanName, initials, cleanPhone, cleanEmail,
              new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })]
          );
        }
      }
      return id;
    });
  } catch (err) {
    // Two people signing up with the same email at the same moment.
    if (String(err?.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    throw err;
  }

  const user = await get(PUBLIC_USER, [userId]);
  res.status(201).json({ token: await signToken(user), user });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const row = await get("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);
  if (!row || !bcrypt.compareSync(String(password), row.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  const user = await get(PUBLIC_USER, [row.id]);
  res.json({ token: await signToken(user), user });
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: await get(PUBLIC_USER, [req.user.id]) });
});

export default router;
