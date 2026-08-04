import fs from "node:fs";
import path from "node:path";

const CANONICAL_SITE_URL = "https://www.lethela.co.za";

function parseEnvFile(contents) {
  const values = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function loadValues(fileArg) {
  if (!fileArg) return { values: { ...process.env }, source: "process.env" };
  const filePath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) throw new Error(`Env file not found: ${filePath}`);
  return {
    values: parseEnvFile(fs.readFileSync(filePath, "utf8")),
    source: filePath,
  };
}

function decodeKey(value) {
  const trimmed = String(value || "").trim();
  if (/^[a-f0-9]{64}$/i.test(trimmed)) return Buffer.from(trimmed, "hex");
  const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`;
  return Buffer.from(padded, "base64");
}

function read(values, key) {
  return String(values[key] || "").trim();
}

const { values, source } = loadValues(process.argv[2]);
const errors = [];
const warnings = [];

for (const key of ["NEXT_PUBLIC_SITE_URL", "NEXTAUTH_URL"]) {
  const value = read(values, key).replace(/\/+$/, "");
  if (value !== CANONICAL_SITE_URL) {
    errors.push(`${key}: must be exactly ${CANONICAL_SITE_URL}.`);
  }
}

for (const key of [
  "NEXTAUTH_SECRET",
  "VENDOR_SESSION_SECRET",
  "RIDER_CONSOLE_SECRET",
  "ADMIN_APPROVAL_KEY",
]) {
  if (!read(values, key)) errors.push(`${key}: must be configured with a protected server secret.`);
}

const bankKey = read(values, "BANK_DATA_ENCRYPTION_KEY");
if (!bankKey) {
  errors.push(
    "BANK_DATA_ENCRYPTION_KEY: a dedicated 32-byte production key is required; do not rely on a session-secret fallback for launch.",
  );
} else {
  try {
    if (decodeKey(bankKey).length !== 32) {
      errors.push("BANK_DATA_ENCRYPTION_KEY: must decode to exactly 32 bytes.");
    }
  } catch {
    errors.push("BANK_DATA_ENCRYPTION_KEY: must be valid base64, base64url, or 64-character hex.");
  }
}

const uploadStorage = read(values, "UPLOAD_STORAGE").toLowerCase();
if (uploadStorage !== "supabase") {
  errors.push("UPLOAD_STORAGE: production must use durable private-capable Supabase storage.");
}
if (!read(values, "SUPABASE_URL")) errors.push("SUPABASE_URL: must be configured.");
if (!read(values, "SUPABASE_SERVICE_ROLE")) {
  errors.push("SUPABASE_SERVICE_ROLE: must be configured as a server-only secret.");
}
if (!read(values, "SUPABASE_PRIVATE_BUCKET")) {
  errors.push("SUPABASE_PRIVATE_BUCKET: a non-public KYC, banking and licence bucket is required.");
}

const verificationRequired = read(values, "EMAIL_VERIFICATION_REQUIRED").toLowerCase();
if (verificationRequired && !["true", "false"].includes(verificationRequired)) {
  errors.push("EMAIL_VERIFICATION_REQUIRED: must be exactly true or false.");
}
if (verificationRequired === "true") {
  if (!read(values, "RESEND_API_KEY")) {
    errors.push("RESEND_API_KEY: required when mandatory email verification is enabled.");
  }
  if (!read(values, "EMAIL_VERIFICATION_SECRET") && !read(values, "NEXTAUTH_SECRET")) {
    errors.push(
      "EMAIL_VERIFICATION_SECRET or NEXTAUTH_SECRET: required to sign email verification links.",
    );
  }
}

const launchMode = read(values, "NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE").toLowerCase() || "prelaunch";
if (!["prelaunch", "pilot", "public"].includes(launchMode)) {
  errors.push(
    "NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE: must be prelaunch, pilot or public.",
  );
}
if (launchMode === "public") {
  for (const key of [
    "DATABASE_RESTORE_TESTED_AT",
    "PRIVATE_STORAGE_VERIFIED_AT",
    "REFUND_FLOW_TESTED_AT",
  ]) {
    if (!read(values, key)) {
      errors.push(`${key}: required before public launch mode may be enabled.`);
    }
  }
}

if (!read(values, "SENTRY_DSN")) {
  warnings.push("SENTRY_DSN: production error monitoring is strongly recommended.");
}
if (!read(values, "SUPPORT_EMAIL_TO") && !read(values, "ADMIN_NOTIFICATION_EMAILS")) {
  warnings.push("SUPPORT_EMAIL_TO: configure a monitored support-case inbox.");
}
if (!read(values, "PRIVATE_STORAGE_VERIFIED_AT")) {
  warnings.push(
    "PRIVATE_STORAGE_VERIFIED_AT: record the last cross-account access and signed-link expiry test.",
  );
}
if (!read(values, "DATABASE_RESTORE_TESTED_AT")) {
  warnings.push("DATABASE_RESTORE_TESTED_AT: record a successful restore drill before public launch.");
}

console.log(`Checking Lethela security environment from ${source}`);
for (const error of errors) console.log(`ERROR: ${error}`);
for (const warning of warnings) console.log(`WARNING: ${warning}`);

if (errors.length) {
  console.log(`Result: FAILED with ${errors.length} error(s).`);
  process.exitCode = 1;
} else {
  console.log(
    warnings.length ? `Result: PASS with ${warnings.length} warning(s).` : "Result: PASS.",
  );
}
