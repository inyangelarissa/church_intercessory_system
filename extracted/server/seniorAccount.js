import bcrypt from "bcryptjs";
import { get, run } from "./db.js";
import { SENIOR_ROLE } from "./auth.js";

/**
 * Create the Senior Intercessor (admin) account, or promote/refresh it if the email already exists.
 * The password is always set to the one supplied.
 */
export async function upsertSenior({ name, email, password, phone }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !password) throw new Error("Senior Intercessor email and password are required.");
  if (String(password).length < 8) throw new Error("Senior Intercessor password must be at least 8 characters.");
  const existing = await get("SELECT id, role, password_hash FROM users WHERE email = ?", [cleanEmail]);
  if (existing) {
    // Already up to date? Skip the write (this runs on every serverless cold start).
    const same = existing.role === SENIOR_ROLE && bcrypt.compareSync(String(password), existing.password_hash);
    if (same) return { id: existing.id, created: false, changed: false };
    const hash = bcrypt.hashSync(String(password), 10);
    await run("UPDATE users SET role = ?, password_hash = ?, name = COALESCE(NULLIF(?, ''), name) WHERE id = ?", [
      SENIOR_ROLE, hash, (name || "").trim(), existing.id,
    ]);
    return { id: existing.id, created: false, changed: true };
  }
  const hash = bcrypt.hashSync(String(password), 10);
  const info = await run(
    "INSERT INTO users (name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, ?)",
    [(name || "Senior Intercessor").trim(), cleanEmail, phone?.trim() || null, SENIOR_ROLE, hash]
  );
  return { id: info.lastInsertRowid, created: true, changed: true };
}

/** Called once per server start: creates the senior account from SENIOR_* environment variables. */
export async function bootstrapSenior() {
  const { SENIOR_EMAIL, SENIOR_PASSWORD, SENIOR_NAME } = process.env;
  if (SENIOR_EMAIL && SENIOR_PASSWORD) {
    try {
      const { created, changed } = await upsertSenior({ name: SENIOR_NAME, email: SENIOR_EMAIL, password: SENIOR_PASSWORD });
      if (changed) console.log(`[auth] Senior Intercessor account ${created ? "created" : "updated"} for ${SENIOR_EMAIL.toLowerCase()}`);
    } catch (err) {
      console.error(`[auth] Could not set up Senior Intercessor: ${err.message}`);
    }
    return;
  }
  const row = await get("SELECT COUNT(*) AS c FROM users WHERE role = ?", [SENIOR_ROLE]);
  if (row.c === 0) {
    console.warn("[auth] No Senior Intercessor exists yet. Set SENIOR_EMAIL, SENIOR_PASSWORD (and SENIOR_NAME) in your environment variables.");
  }
}
