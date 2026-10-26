// Usage: npm run create-senior -- "Full Name" email@example.org "a-strong-password"
// Connects to whatever database your environment points at (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN,
// DATABASE_PATH, or the local file), so you can run it against the production database too.
import { ready } from "../db.js";
import { upsertSenior } from "../seniorAccount.js";

const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password) {
  console.error('Usage: npm run create-senior -- "Full Name" email@example.org "password (min 8 chars)"');
  process.exit(1);
}
try {
  await ready();
  const { created } = await upsertSenior({ name, email, password });
  console.log(`Senior Intercessor ${created ? "created" : "updated"}: ${email.toLowerCase()}`);
  process.exit(0);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
