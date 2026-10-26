import bcrypt from "bcryptjs";
import { db } from "./db.js";
import { SENIOR_ROLE } from "./auth.js";

/**
 * Create the Senior Intercessor (admin) account, or promote/refresh it if the email already exists.
 * The password is always set to the one supplied.
 */
export function upsertSenior({ name, email, password, phone }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !password) throw new Error("Senior Intercessor email and password are required.");
  if (String(password).length < 8) throw new Error("Senior Intercessor password must be at least 8 characters.");
  const hash = bcrypt.hashSync(String(password), 10);
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
  if (existing) {
    db.prepare("UPDATE users SET role = ?, password_hash = ?, name = COALESCE(NULLIF(?, ''), name) WHERE id = ?")
      .run(SENIOR_ROLE, hash, (name || "").trim(), existing.id);
    return { id: existing.id, created: false };
  }
  const info = db.prepare("INSERT INTO users (name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, ?)")
    .run((name || "Senior Intercessor").trim(), cleanEmail, phone?.trim() || null, SENIOR_ROLE, hash);
  return { id: Number(info.lastInsertRowid), created: true };
}

/** Called at server start: creates the senior account from SENIOR_* environment variables. */
export function bootstrapSenior() {
  const { SENIOR_EMAIL, SENIOR_PASSWORD, SENIOR_NAME } = process.env;
  if (SENIOR_EMAIL && SENIOR_PASSWORD) {
    try {
      const { created } = upsertSenior({ name: SENIOR_NAME, email: SENIOR_EMAIL, password: SENIOR_PASSWORD });
      console.log(`[auth] Senior Intercessor account ${created ? "created" : "updated"} for ${SENIOR_EMAIL.toLowerCase()}`);
    } catch (err) {
      console.error(`[auth] Could not set up Senior Intercessor: ${err.message}`);
    }
    return;
  }
  const count = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = ?").get(SENIOR_ROLE).c;
  if (count === 0) {
    console.warn("[auth] No Senior Intercessor exists yet. Set SENIOR_EMAIL, SENIOR_PASSWORD (and SENIOR_NAME) or run: npm run create-senior -- \"Full Name\" email password");
  }
}
