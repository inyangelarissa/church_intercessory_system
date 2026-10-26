// Usage: npm run create-senior -- "Full Name" email@example.org "a-strong-password"
import { upsertSenior } from "../seniorAccount.js";

const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password) {
  console.error('Usage: npm run create-senior -- "Full Name" email@example.org "password (min 8 chars)"');
  process.exit(1);
}
try {
  const { created } = upsertSenior({ name, email, password });
  console.log(`Senior Intercessor ${created ? "created" : "updated"}: ${email.toLowerCase()}`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
