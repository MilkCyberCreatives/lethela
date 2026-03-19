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
  successUrl: string;
  cancelUrl: string;
  errorUrl?: string;
  notifyUrl: string;
  isTest?: boolean; // true for sandbox/dev
};

type OzowResponseArgs = {
  siteCode: string;
  transactionId: string;
  transactionReference: string;
  amount: string;
  status: string;
  optional1?: string;
  optional2?: string;
  optional3?: string;
  optional4?: string;
  optional5?: string;
  currencyCode?: string;
  isTest?: string;
  statusMessage?: string;
  privateKey: string;
};

function toAmountString(cents: number) {
  // 2 decimals, dot, no thousands sep
  return (cents / 100).toFixed(2);
}

function sha512(input: string) {
  return crypto.createHash("sha512").update(input, "utf8").digest("hex");
}

function buildOzowHash(parts: Array<string | undefined>) {
  return sha512(parts.map((part) => part ?? "").join("").toLowerCase()).toUpperCase();
}

function clamp(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

export function createOrderReference() {
  return `LET-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`.toUpperCase();
}

export function buildOzowResponseHash({
  siteCode,
  transactionId,
  transactionReference,
  amount,
  status,
  optional1,
  optional2,
  optional3,
  optional4,
  optional5,
  currencyCode = "ZAR",
  isTest = "false",
  statusMessage,
  privateKey,
}: OzowResponseArgs) {
  return buildOzowHash([
    siteCode,
    transactionId,
    transactionReference,
    amount,
    status,
    optional1,
    optional2,
    optional3,
    optional4,
    optional5,
    currencyCode,
    isTest,
    statusMessage,
    privateKey,
  ]);
}

export function buildOzowRedirectUrl({
  siteCode,
  privateKey,
  amountCents,
  transactionReference,
  bankReference,
  successUrl,
  cancelUrl,
  errorUrl,
  notifyUrl,
  isTest = true
}: CreateUrlArgs) {
  const countryCode = "ZA";
  const currencyCode = "ZAR";
  const amount = toAmountString(amountCents);
  const safeTransactionReference = clamp(transactionReference, 50);
  const bankRef = clamp(bankReference ?? safeTransactionReference, 20);
  const resolvedErrorUrl = errorUrl ?? cancelUrl;
  const testFlag = isTest ? "true" : "false";

  const hash = buildOzowHash([
    siteCode,
    countryCode,
    currencyCode,
    amount,
    safeTransactionReference,
    bankRef,
    "",
    "",
    "",
    "",
    "",
    "",
    cancelUrl,
    resolvedErrorUrl,
    successUrl,
    notifyUrl,
    testFlag,
    privateKey,
  ]);

  const params = new URLSearchParams({
    SiteCode: siteCode,
    CountryCode: countryCode,
    CurrencyCode: currencyCode,
    Amount: amount,
    TransactionReference: safeTransactionReference,
    BankReference: bankRef,
    SuccessUrl: successUrl,
    CancelUrl: cancelUrl,
    ErrorUrl: resolvedErrorUrl,
    NotifyUrl: notifyUrl,
    IsTest: testFlag,
    HashCheck: hash
  });

  // Sandbox host (same path usually used in production; this is fine for dev)
  return `https://pay.ozow.com/?${params.toString()}`;
}
