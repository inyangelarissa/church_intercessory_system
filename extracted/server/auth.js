import crypto from "crypto";
import jwt from "jsonwebtoken";
import { db } from "./db.js";

export const SENIOR_ROLE = "Senior Intercessor";
export const INTERCESSOR_ROLE = "Intercessor";

export function isSenior(user) {
  return user?.role === SENIOR_ROLE;
}

// Signing key: JWT_SECRET if provided, otherwise a random key generated once and stored in the
// database, so there is never a guessable default secret.
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'jwt_secret'").get();
  if (row) return row.value;
  const secret = crypto.randomBytes(48).toString("hex");
  db.prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('jwt_secret', ?)").run(secret);
  return db.prepare("SELECT value FROM app_settings WHERE key = 'jwt_secret'").get().value;
}
const JWT_SECRET = loadSecret();

export function signToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });
}

// Verifies the token, then loads the user fresh from the database so role changes and
// deleted accounts take effect immediately.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required." });
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }
  const user = db.prepare("SELECT id, name, email, phone, role FROM users WHERE id = ?").get(payload.sub);
  if (!user) return res.status(401).json({ error: "This account no longer exists. Please log in again." });
  req.user = user;
  next();
}

export function requireSenior(req, res, next) {
  if (!isSenior(req.user)) {
    return res.status(403).json({ error: "Only the Senior Intercessor can do this." });
  }
  next();
}

// The roster (intercessors table) row linked to a login account, if any.
export function intercessorIdForUser(userId) {
  return db.prepare("SELECT id FROM intercessors WHERE user_id = ?").get(userId)?.id ?? null;
}
