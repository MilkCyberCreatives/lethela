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

const { values, source } = loadValues(process.argv[2]);
const errors = [];
const warnings = [];

for (const key of ["NEXT_PUBLIC_SITE_URL", "NEXTAUTH_URL"]) {
  const value = String(values[key] || "")
    .trim()
    .replace(/\/+$/, "");
  if (value !== CANONICAL_SITE_URL) {
    errors.push(`${key}: must be exactly ${CANONICAL_SITE_URL}.`);
  }
}

const bankKey = String(values.BANK_DATA_ENCRYPTION_KEY || "").trim();
if (!bankKey) {
  errors.push(
    "BANK_DATA_ENCRYPTION_KEY: generate a dedicated 32-byte key before the production banking migration.",
  );
} else {
  try {
    if (decodeKey(bankKey).length !== 32) {
      errors.push("BANK_DATA_ENCRYPTION_KEY: must decode to exactly 32 bytes.");
    }
  } catch {
    errors.push(
      "BANK_DATA_ENCRYPTION_KEY: must be valid base64, base64url, or 64-character hex.",
    );
  }
}

if (!String(values.SUPABASE_PRIVATE_BUCKET || "").trim()) {
  warnings.push(
    "SUPABASE_PRIVATE_BUCKET: private KYC and licence storage is not configured.",
  );
}

console.log(`Checking Lethela security environment from ${source}`);
for (const error of errors) console.log(`ERROR: ${error}`);
for (const warning of warnings) console.log(`WARNING: ${warning}`);

if (errors.length) {
  console.log(`Result: FAILED with ${errors.length} error(s).`);
  process.exitCode = 1;
} else {
  console.log(
    warnings.length
      ? `Result: PASS with ${warnings.length} warning(s).`
      : "Result: PASS.",
  );
}
