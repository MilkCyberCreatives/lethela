import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  assert.equal(REGISTRATION_PASSWORD_MIN_LENGTH, 6);
  assert.equal(registrationPasswordIsValid("123456"), true);
  assert.equal(registrationPasswordIsValid("12345"), false);
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

test("a sign-up tapped before the page loads never puts the password in the address bar", async () => {
  const form = await readFile(
    new URL("../src/components/auth/MinimalSignupForm.tsx", import.meta.url),
    "utf8",
  );
  // The inputs are named for password managers, so a plain GET would copy them into the URL.
  assert.match(form, /name="password"/);
  assert.match(form, /<form className="grid gap-4" method="post" onSubmit=\{submit\}>/);
});

test("after sign-up or sign-in the dashboard opens with a full page load", async () => {
  const forms = await Promise.all(
    ["MinimalSignupForm", "SignInForm", "VendorSignInForm"].map((name) =>
      readFile(new URL(`../src/components/auth/${name}.tsx`, import.meta.url), "utf8"),
    ),
  );
  for (const form of forms) {
    // router.refresh() right after a navigation can finish last and undo it.
    assert.doesNotMatch(form, /router\.refresh\(\)/);
    assert.match(form, /window\.location\.replace\(/);
  }
});
