import assert from "node:assert/strict";
import test from "node:test";
import {
  bankAccountLast4,
  decryptBankAccountNumber,
  encryptBankAccountNumber,
  isEncryptedBankAccountNumber,
} from "../src/lib/bank-data";
import { emailAddressesMatch, normalizeEmailAddress } from "../src/lib/identity";
import { AccountPasswordSchema } from "../src/lib/registration-schema";

const originalBankKey = process.env.BANK_DATA_ENCRYPTION_KEY;
const originalAuthSecret = process.env.NEXTAUTH_SECRET;
const originalNodeEnv = process.env.NODE_ENV;

function restoreEnvironment() {
  if (originalBankKey === undefined) delete process.env.BANK_DATA_ENCRYPTION_KEY;
  else process.env.BANK_DATA_ENCRYPTION_KEY = originalBankKey;
  if (originalAuthSecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = originalAuthSecret;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
}

test.after(restoreEnvironment);

test("email identity handling is trim and case insensitive", () => {
  assert.equal(normalizeEmailAddress("  Person@Example.COM "), "person@example.com");
  assert.equal(emailAddressesMatch("Person@Example.com", " person@example.COM "), true);
});

test("password reset uses the same password policy as registration", () => {
  assert.equal(AccountPasswordSchema.safeParse("1234").success, false);
  assert.equal(AccountPasswordSchema.safeParse("12345").success, true);
  assert.equal(AccountPasswordSchema.safeParse("a secure passphrase").success, true);
});

test("bank account values use authenticated encryption and retain only a display suffix", () => {
  process.env.BANK_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  delete process.env.NEXTAUTH_SECRET;

  const encrypted = encryptBankAccountNumber(" 0012 3456 7890 ");
  assert.equal(isEncryptedBankAccountNumber(encrypted), true);
  assert.equal(encrypted.includes("001234567890"), false);
  assert.equal(bankAccountLast4(encrypted), "7890");
  assert.equal(decryptBankAccountNumber(encrypted), "001234567890");
});

test("production can use the protected authentication secret as a transitional bank key", () => {
  delete process.env.BANK_DATA_ENCRYPTION_KEY;
  process.env.NEXTAUTH_SECRET = "a-long-production-authentication-secret";
  process.env.NODE_ENV = "production";

  const encrypted = encryptBankAccountNumber("1234567890");
  assert.match(encrypted, /^enc:v1:auth:/);
  assert.equal(decryptBankAccountNumber(encrypted), "1234567890");
});

test("tampered bank ciphertext is rejected", () => {
  process.env.BANK_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
  const encrypted = encryptBankAccountNumber("1234567890");
  const parts = encrypted.split(":");
  const tag = Buffer.from(parts[4], "base64url");
  tag[0] ^= 1;
  parts[4] = tag.toString("base64url");
  assert.throws(() => decryptBankAccountNumber(parts.join(":")));
});
