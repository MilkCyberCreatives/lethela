import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createPasswordResetToken,
  passwordResetFingerprint,
  readPasswordResetToken,
} from "../src/lib/password-reset";

test("invited staff without a password can receive a single-use reset token", () => {
  process.env.PASSWORD_RESET_SECRET = "test-reset-secret";
  const token = createPasswordResetToken({
    userId: "u1",
    email: "staff@example.com",
    passwordHash: "",
  });
  const payload = readPasswordResetToken(token);
  assert.ok(payload);
  assert.equal(payload.pw, passwordResetFingerprint(""));
  assert.notEqual(payload.pw, passwordResetFingerprint("$2a$12$newhash"));
});

test("forgot-password does not reveal accounts when email is not configured", () => {
  const source = fs.readFileSync("src/app/api/auth/forgot-password/route.ts", "utf8");
  const configCheck = source.indexOf("!passwordResetEmailConfigured()");
  const userLookup = source.indexOf("prisma.user.findUnique");
  assert.ok(configCheck > -1 && userLookup > -1 && configCheck < userLookup);
});

test("vendor team invites never overwrite an existing user's details", () => {
  const source = fs.readFileSync("src/app/api/vendors/team/route.ts", "utf8");
  assert.match(source, /update: \{\},/);
});

test("password reset email escapes the account name", () => {
  const source = fs.readFileSync("src/lib/password-reset.ts", "utf8");
  assert.match(source, /Hello \$\{escapeHtml\(label\)\}/);
});
