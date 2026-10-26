import crypto from "crypto";
import jwt from "jsonwebtoken";
import { get, run } from "./db.js";

export const SENIOR_ROLE = "Senior Intercessor";
export const INTERCESSOR_ROLE = "Intercessor";

export function isSenior(user) {
  return user?.role === SENIOR_ROLE;
}

// Signing key: JWT_SECRET if provided, otherwise a random key generated once and stored in the
// database (shared by every serverless instance), so there is never a guessable default secret.
let secretPromise = null;
function getSecret() {
  if (process.env.JWT_SECRET) return Promise.resolve(process.env.JWT_SECRET);
  if (!secretPromise) {
    secretPromise = (async () => {
      const row = await get("SELECT value FROM app_settings WHERE key = 'jwt_secret'");
      if (row) return row.value;
      await run("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('jwt_secret', ?)", [
        crypto.randomBytes(48).toString("hex"),
      ]);
      return (await get("SELECT value FROM app_settings WHERE key = 'jwt_secret'")).value;
    })().catch(err => {
      secretPromise = null;
      throw err;
    });
  }
  return secretPromise;
}

export async function signToken(user) {
  return jwt.sign({ sub: user.id }, await getSecret(), { expiresIn: "7d" });
}

// Verifies the token, then loads the user fresh from the database so role changes and
// deleted accounts take effect immediately.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required." });
  let payload;
  try {
    payload = jwt.verify(token, await getSecret());
  } catch (err) {
    if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError" || err?.name === "NotBeforeError") {
      return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
    }
    throw err; // a database problem, not a bad token
  }
  const user = await get("SELECT id, name, email, phone, role FROM users WHERE id = ?", [payload.sub]);
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
export async function intercessorIdForUser(userId) {
  return (await get("SELECT id FROM intercessors WHERE user_id = ?", [userId]))?.id ?? null;
}
