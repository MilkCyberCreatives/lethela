// /src/lib/ozow.ts
import crypto from "crypto";

/**
 * Build an Ozow Hosted Redirect URL.
 * NOTE: This follows the common Ozow hashing pattern. We'll verify against docs in a later hardening pass.
 */
type CreateUrlArgs = {
  siteCode: string;
  privateKey: string;
  amountCents: number;
  transactionReference: string;
  bankReference?: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  isTest?: boolean; // true for sandbox/dev
};

function toAmountString(cents: number) {
  // 2 decimals, dot, no thousands sep
  return (cents / 100).toFixed(2);
}

function sha512(input: string) {
  return crypto.createHash("sha512").update(input, "utf8").digest("hex");
}

export function buildOzowRedirectUrl({
  siteCode,
  privateKey,
  amountCents,
  transactionReference,
  bankReference,
  returnUrl,
  cancelUrl,
  notifyUrl,
  isTest = true
}: CreateUrlArgs) {
  const countryCode = "ZA";
  const currencyCode = "ZAR";
  const amount = toAmountString(amountCents);
  const bankRef = bankReference ?? transactionReference;
  const testFlag = isTest ? "true" : "false";

  // Concatenation order is important; this is a typical order used by Ozow for Hosted Redirect.
  // If needed, adjust once live credentials are used.
  const concat =
    siteCode +
    countryCode +
    currencyCode +
    amount +
    transactionReference +
    bankRef +
    returnUrl +
    cancelUrl +
    notifyUrl +
    testFlag +
    privateKey;

  const hash = sha512(concat).toUpperCase();

  const params = new URLSearchParams({
    siteCode,
    countryCode,
    currencyCode,
    amount,
    transactionReference,
    bankReference: bankRef,
    returnUrl,
    cancelUrl,
    notifyUrl,
    isTest: testFlag,
    hashCheck: hash
  });

  // Sandbox host (same path usually used in production; this is fine for dev)
  return `https://pay.ozow.com/?${params.toString()}`;
}
