import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmailVerificationToken,
  isEmailVerificationRequired,
  verifyEmailVerificationToken,
} from "@/lib/email-verification";

const previousSecret = process.env.EMAIL_VERIFICATION_SECRET;
const previousRequired = process.env.EMAIL_VERIFICATION_REQUIRED;

test.beforeEach(() => {
  process.env.EMAIL_VERIFICATION_SECRET = "email-verification-test-secret";
  delete process.env.EMAIL_VERIFICATION_REQUIRED;
});

test.after(() => {
  if (previousSecret === undefined) delete process.env.EMAIL_VERIFICATION_SECRET;
  else process.env.EMAIL_VERIFICATION_SECRET = previousSecret;

  if (previousRequired === undefined) delete process.env.EMAIL_VERIFICATION_REQUIRED;
  else process.env.EMAIL_VERIFICATION_REQUIRED = previousRequired;
});

test("email verification token validates the matching user and email", () => {
  const token = createEmailVerificationToken({ id: "user-1", email: "User@Example.com" });
  const verified = verifyEmailVerificationToken(token);
  assert.ok(verified);
  assert.equal(verified.userId, "user-1");
  assert.equal(verified.email, "user@example.com");
});

test("tampered email verification token is rejected", () => {
  const token = createEmailVerificationToken({ id: "user-1", email: "user@example.com" });
  const tampered = token.replace("user-1", "user-2");
  assert.equal(verifyEmailVerificationToken(tampered), null);
});

test("mandatory verification only activates explicitly", () => {
  assert.equal(isEmailVerificationRequired(), false);
  process.env.EMAIL_VERIFICATION_REQUIRED = "true";
  assert.equal(isEmailVerificationRequired(), true);
});
