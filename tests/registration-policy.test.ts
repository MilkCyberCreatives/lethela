import assert from "node:assert/strict";
import test from "node:test";
import { MinimalRegistrationSchema } from "../src/lib/registration-schema";
import {
  REGISTRATION_PASSWORD_MAX_LENGTH,
  REGISTRATION_PASSWORD_MIN_LENGTH,
  registrationPasswordIsValid,
} from "../src/lib/registration-policy";

test("minimal registration accepts only the account credentials and normalizes email", () => {
  const result = MinimalRegistrationSchema.parse({
    email: "  New.User@Example.COM ",
    password: "a secure passphrase",
    acceptTerms: true,
  });

  assert.equal(result.email, "new.user@example.com");
  assert.equal(result.password, "a secure passphrase");
});

test("registration password policy accepts long passphrases without composition rules", () => {
  assert.equal(registrationPasswordIsValid("this is a safe passphrase"), true);
  assert.equal(
    registrationPasswordIsValid("A".repeat(REGISTRATION_PASSWORD_MIN_LENGTH - 1)),
    false,
  );
  assert.equal(
    registrationPasswordIsValid("A".repeat(REGISTRATION_PASSWORD_MAX_LENGTH + 1)),
    false,
  );
});

test("registration rejects passwords that exceed the bcrypt byte boundary", () => {
  const multiBytePassword = "🔐".repeat(20);
  assert.equal(Array.from(multiBytePassword).length, 20);
  assert.equal(registrationPasswordIsValid(multiBytePassword), false);
  assert.equal(
    MinimalRegistrationSchema.safeParse({
      email: "person@example.com",
      password: multiBytePassword,
      acceptTerms: true,
    }).success,
    false,
  );
});
