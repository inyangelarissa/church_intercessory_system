// Input validation for email addresses and phone numbers.
// The browser has a copy of the same rules in src/lib/validation.ts for instant feedback;
// the server always re-checks, because the browser can be bypassed. Keep the two in sync
// (run `npm test` to check this copy).

const EMAIL_LOCAL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Validates and normalises (trimmed, lower-case) an email address.
 * Returns { ok, value, error }. An empty value is valid unless `required` is set.
 */
export function checkEmail(raw, { required = true } = {}) {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) {
    return required ? { ok: false, value, error: "Please enter your email address." } : { ok: true, value: "" };
  }
  const bad = (error) => ({ ok: false, value, error });
  if (/\s/.test(value)) return bad("An email address cannot contain spaces.");
  const at = value.indexOf("@");
  if (at === -1) return bad("An email address must contain @ (for example name@example.com).");
  if (value.indexOf("@", at + 1) !== -1) return bad("An email address can only contain one @.");
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (!local) return bad("Add the part before the @ (for example name@example.com).");
  if (!domain) return bad("Add the domain after the @ (for example name@example.com).");
  if (value.length > 254 || local.length > 64) return bad("This email address is too long.");
  if (!EMAIL_LOCAL_RE.test(local)) return bad("The part before the @ has invalid characters or misplaced dots.");
  const labels = domain.split(".");
  if (labels.length < 2 || !labels.every(label => DOMAIN_LABEL_RE.test(label))) {
    return bad("Enter a valid domain after the @ (for example example.com).");
  }
  if (!/^[a-z]{2,24}$/.test(labels[labels.length - 1])) {
    return bad("The ending of the email (like .com or .rw) looks wrong.");
  }
  return { ok: true, value };
}

const RW_NATIONAL_RE = /^(7[2-9]\d{7}|2\d{8})$/; // Rwanda mobile (072-079) or landline (2xx)
const PHONE_HELP = "Enter a valid phone number, for example 0788 123 456 or +250 788 123 456.";

function formatRwanda(national) {
  return `+250 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

/**
 * Validates a phone number and returns it in a consistent format
 * (Rwandan numbers as "+250 788 123 456", other countries as "+<digits>").
 * Accepts local Rwandan numbers (0788...), and international numbers (+ or 00 prefix, 8-15 digits).
 */
export function checkPhone(raw, { required = false } = {}) {
  const input = String(raw ?? "").trim();
  if (!input) {
    return required ? { ok: false, value: "", error: "Please enter a phone number." } : { ok: true, value: "" };
  }
  const bad = (error) => ({ ok: false, value: input, error });

  let s = input.replace(/[\s().-]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (!/^\+?\d+$/.test(s)) return bad("A phone number can only contain digits, spaces and + - ( ).");

  if (s.startsWith("+")) {
    const digits = s.slice(1);
    if (digits.startsWith("250")) {
      const national = digits.slice(3).replace(/^0/, "");
      return RW_NATIONAL_RE.test(national) ? { ok: true, value: formatRwanda(national) } : bad(PHONE_HELP);
    }
    if (digits.length >= 8 && digits.length <= 15 && !digits.startsWith("0")) return { ok: true, value: "+" + digits };
    return bad(PHONE_HELP);
  }
  if (/^0(7[2-9]\d{7}|2\d{8})$/.test(s)) return { ok: true, value: formatRwanda(s.slice(1)) };
  if (/^250(7[2-9]\d{7}|2\d{8})$/.test(s)) return { ok: true, value: formatRwanda(s.slice(3)) };
  if (/^7[2-9]\d{7}$/.test(s)) return { ok: true, value: formatRwanda(s) };
  return bad(PHONE_HELP);
}

/**
 * A free-text "contact" field may hold a phone number, an email, or both
 * separated by "·", "," or ";". Every part must be valid. Returns { ok, value, error }.
 */
export function checkContact(raw) {
  const parts = String(raw ?? "").split(/[·,;]/).map(p => p.trim()).filter(Boolean);
  const cleaned = [];
  for (const part of parts) {
    if (part.includes("@")) {
      const email = checkEmail(part);
      if (!email.ok) return { ok: false, value: String(raw), error: email.error };
      cleaned.push(email.value);
    } else {
      const phone = checkPhone(part);
      if (!phone.ok) return { ok: false, value: String(raw), error: "Contact must be a valid phone number or email address." };
      cleaned.push(phone.value);
    }
  }
  return { ok: true, value: cleaned.join(" · ") };
}
