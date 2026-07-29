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

function restoreEnvironment() {
  if (originalBankKey === undefined) delete process.env.BANK_DATA_ENCRYPTION_KEY;
  else process.env.BANK_DATA_ENCRYPTION_KEY = originalBankKey;
  if (originalAuthSecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = originalAuthSecret;
}

test.after(restoreEnvironment);

test("email identity handling is trim and case insensitive", () => {
  assert.equal(normalizeEmailAddress("  Person@Example.COM "), "person@example.com");
  assert.equal(emailAddressesMatch("Person@Example.com", " person@example.COM "), true);
});

test("password reset uses the same strong password policy as registration", () => {
  assert.equal(AccountPasswordSchema.safeParse("short123").success, false);
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

test("tampered bank ciphertext is rejected", () => {
  process.env.BANK_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
  const encrypted = encryptBankAccountNumber("1234567890");
  const parts = encrypted.split(":");
  parts[5] = `${parts[5].slice(0, -1)}${parts[5].endsWith("A") ? "B" : "A"}`;
  assert.throws(() => decryptBankAccountNumber(parts.join(":")));
});
