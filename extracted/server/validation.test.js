import test from "node:test";
import assert from "node:assert/strict";
import { checkEmail, checkPhone, checkContact } from "./validation.js";

test("valid emails are accepted and normalised", () => {
  for (const e of ["name@example.com", "  Mary.Uwase@ErcMasoro.ORG ", "a+tag@mail.co.rw", "o'brien@sub.example.com", "x_y-z@ex-ample.com"]) {
    const r = checkEmail(e);
    assert.equal(r.ok, true, e);
    assert.equal(r.value, e.trim().toLowerCase());
  }
});

test("invalid emails are rejected with a message", () => {
  for (const e of ["", "plain", "no@tld", "@example.com", "name@", "a@@b.com", "a b@example.com", "a..b@example.com",
    ".a@example.com", "a.@example.com", "name@-bad.com", "name@bad-.com", "name@exa_mple.com", "name@example.c", "name@example.123", "name@.com", "name@example..com"]) {
    const r = checkEmail(e);
    assert.equal(r.ok, false, `"${e}" should be invalid`);
    assert.ok(r.error);
  }
  assert.equal(checkEmail("a".repeat(65) + "@example.com").ok, false);
  assert.equal(checkEmail("a@" + "b".repeat(250) + ".com").ok, false);
});

test("email is optional when asked", () => {
  assert.deepEqual(checkEmail("  ", { required: false }), { ok: true, value: "" });
  assert.equal(checkEmail("bad", { required: false }).ok, false);
});

test("Rwandan phone numbers are accepted in every common format", () => {
  for (const p of ["0788123456", "0788 123 456", "078-812-3456", "+250788123456", "+250 788 123 456", "+250 (0) 788 123 456",
    "250788123456", "00250788123456", "788123456", "0722123456", "0733123456", "0795123456", "0252503000"]) {
    const r = checkPhone(p);
    assert.equal(r.ok, true, p);
    assert.match(r.value, /^\+250 \d{3} \d{3} \d{3}$/, p);
  }
  assert.equal(checkPhone("0788123456").value, "+250 788 123 456");
});

test("international numbers are accepted", () => {
  assert.equal(checkPhone("+254 712 345 678").value, "+254712345678");
  assert.equal(checkPhone("0044 20 7946 0958").value, "+442079460958");
  assert.equal(checkPhone("+1 (415) 555-2671").value, "+14155552671");
});

test("invalid phone numbers are rejected", () => {
  for (const p of ["abc", "0788", "07881234567", "0711123456", "078812345a", "++250788123456", "+250 788 12", "+0123456789",
    "+1234567", "+1234567890123456", "12345", "0788-123-456-7", "call me"]) {
    const r = checkPhone(p);
    assert.equal(r.ok, false, `"${p}" should be invalid`);
    assert.ok(r.error);
  }
});

test("phone is optional unless required", () => {
  assert.deepEqual(checkPhone("", {}), { ok: true, value: "" });
  assert.equal(checkPhone("", { required: true }).ok, false);
});

test("contact accepts a phone, an email, or both", () => {
  assert.equal(checkContact("0788123456").value, "+250 788 123 456");
  assert.equal(checkContact("Mary@Example.com").value, "mary@example.com");
  assert.equal(checkContact("0788123456 · mary@example.com").value, "+250 788 123 456 · mary@example.com");
  assert.equal(checkContact("0788123456, mary@example.com").ok, true);
  assert.equal(checkContact("").value, "");
  assert.equal(checkContact("not a contact").ok, false);
  assert.equal(checkContact("0788123456 · bad@").ok, false);
});
