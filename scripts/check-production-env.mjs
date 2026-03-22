import fs from "node:fs";
import path from "node:path";

const PLACEHOLDER_PATTERNS = [
  /^replace-with/i,
  /^your-/i,
  /^example$/i,
  /^example\./i,
];

function parseEnvFile(contents) {
  const result = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function loadEnvFromArg(fileArg) {
  if (!fileArg) {
    return { values: { ...process.env }, source: "process.env" };
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Env file not found: ${filePath}`);
  }

  return {
    values: parseEnvFile(fs.readFileSync(filePath, "utf8")),
    source: filePath,
  };
}

function looksLikePlaceholder(value) {
  if (!value) return true;
  const normalized = value.trim();
  if (!normalized) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function isAbsoluteSqliteUrl(value) {
  if (!value?.startsWith("file:")) return false;
  const body = value.slice("file:".length);
  return body.startsWith("/") || /^[A-Za-z]:\//.test(body);
}

function read(key, values) {
  return (values[key] || "").trim();
}

const argFile = process.argv[2];
const { values, source } = loadEnvFromArg(argFile);

const errors = [];
const warnings = [];
const notes = [];

function requireNonPlaceholder(key, message) {
  const value = read(key, values);
  if (looksLikePlaceholder(value)) {
    errors.push(`${key}: ${message}`);
  }
  return value;
}

function warnIfMissing(key, message) {
  const value = read(key, values);
  if (!value) {
    warnings.push(`${key}: ${message}`);
  }
  return value;
}

const nodeEnv = requireNonPlaceholder("NODE_ENV", "must be set to production.");
if (nodeEnv && nodeEnv !== "production") {
  errors.push("NODE_ENV: must be exactly 'production' for a live deployment.");
}

const publicSiteUrl = requireNonPlaceholder(
  "NEXT_PUBLIC_SITE_URL",
  "must be set to your public canonical HTTPS domain."
);
if (publicSiteUrl && !isHttpsUrl(publicSiteUrl)) {
  errors.push("NEXT_PUBLIC_SITE_URL: must be a valid HTTPS URL.");
}

const nextAuthUrl = requireNonPlaceholder(
  "NEXTAUTH_URL",
  "must be set to your public canonical HTTPS domain."
);
if (nextAuthUrl && !isHttpsUrl(nextAuthUrl)) {
  errors.push("NEXTAUTH_URL: must be a valid HTTPS URL.");
}

if (publicSiteUrl && nextAuthUrl && publicSiteUrl !== nextAuthUrl) {
  warnings.push("NEXT_PUBLIC_SITE_URL/NEXTAUTH_URL: these should usually match exactly.");
}

requireNonPlaceholder("NEXTAUTH_SECRET", "must be a long random secret.");
requireNonPlaceholder("VENDOR_SESSION_SECRET", "should be set to a long random secret.");
requireNonPlaceholder("RIDER_CONSOLE_SECRET", "should be set to a long random secret.");
requireNonPlaceholder("ADMIN_APPROVAL_KEY", "must be set for admin browser access and bootstrap.");

const databaseProvider = requireNonPlaceholder(
  "DATABASE_PROVIDER",
  "must be set to postgresql for a live deployment."
);
if (databaseProvider && databaseProvider !== "postgresql") {
  errors.push("DATABASE_PROVIDER: must be exactly 'postgresql' for production.");
}

const databaseUrl = requireNonPlaceholder(
  "DATABASE_URL",
  "must point to your production PostgreSQL database."
);

if (databaseUrl) {
  const normalizedUrl = databaseUrl.toLowerCase();
  if (!(normalizedUrl.startsWith("postgres://") || normalizedUrl.startsWith("postgresql://"))) {
    errors.push("DATABASE_URL: must be a PostgreSQL connection string for production.");
  }
  if (/^file:\.\.?\//.test(databaseUrl) || databaseUrl === "file:./dev.db" || isAbsoluteSqliteUrl(databaseUrl)) {
    errors.push("DATABASE_URL: SQLite is no longer an accepted production database profile.");
  }
}

requireNonPlaceholder("GOOGLE_MAPS_API_KEY", "must be set for server-side geocoding and delivery quotes.");
requireNonPlaceholder("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "must be set for live browser maps.");

requireNonPlaceholder("SUPABASE_URL", "must be set for durable uploads.");
requireNonPlaceholder("SUPABASE_SERVICE_ROLE", "must be set for durable uploads.");
requireNonPlaceholder("SUPABASE_BUCKET", "must be set for durable uploads.");
const storageBucketUrl = requireNonPlaceholder(
  "STORAGE_BUCKET_URL",
  "should be set so uploaded media resolves to an absolute public URL."
);
if (storageBucketUrl && !isHttpsUrl(storageBucketUrl)) {
  errors.push("STORAGE_BUCKET_URL: must be a valid HTTPS URL.");
}

requireNonPlaceholder("OZOW_SITE_CODE", "must be set for live payments.");
requireNonPlaceholder("OZOW_PRIVATE_KEY", "must be set for live payments.");

const ozowIsTest = requireNonPlaceholder("OZOW_IS_TEST", "must be set to false in production.");
if (ozowIsTest && ozowIsTest !== "false") {
  errors.push("OZOW_IS_TEST: must be exactly 'false' for live payments.");
}

const nextPublicOzowIsTest = requireNonPlaceholder(
  "NEXT_PUBLIC_OZOW_IS_TEST",
  "must be set to false in production."
);
if (nextPublicOzowIsTest && nextPublicOzowIsTest !== "false") {
  errors.push("NEXT_PUBLIC_OZOW_IS_TEST: must be exactly 'false' for live checkout.");
}

warnIfMissing("PASSWORD_RESET_SECRET", "recommended so password reset does not rely on NEXTAUTH_SECRET.");
warnIfMissing("PASSWORD_RESET_EMAIL_FROM", "recommended if you want public password reset emails to work.");
warnIfMissing("RESEND_API_KEY", "recommended if you want email notifications and password reset emails.");
warnIfMissing("ADMIN_NOTIFICATION_EMAILS", "recommended if admins should receive email alerts.");
warnIfMissing("ADMIN_NOTIFICATION_EMAIL_FROM", "recommended if admins should receive email alerts.");
warnIfMissing("PUSHER_APP_ID", "recommended if you want realtime updates.");
warnIfMissing("PUSHER_KEY", "recommended if you want realtime updates.");
warnIfMissing("PUSHER_SECRET", "recommended if you want realtime updates.");
warnIfMissing("NEXT_PUBLIC_PUSHER_KEY", "recommended if you want realtime updates.");
warnIfMissing("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "recommended if you want web push.");
warnIfMissing("WEB_PUSH_VAPID_PRIVATE_KEY", "recommended if you want web push.");
warnIfMissing("SENTRY_DSN", "recommended for production error monitoring.");
warnIfMissing("SENTRY_ENVIRONMENT", "recommended for production error monitoring.");
warnIfMissing("NEXT_PUBLIC_SUPPORT_EMAIL", "recommended for legal and support pages.");

notes.push("Production scale now assumes PostgreSQL and durable object storage.");
notes.push("Order tracking references should be treated as secrets.");
notes.push("Server-action origins are derived from NEXT_PUBLIC_SITE_URL, NEXTAUTH_URL, and VERCEL_URL.");

console.log(`Checking production environment from ${source}`);
console.log("");

if (errors.length) {
  console.log("Errors:");
  for (const error of errors) {
    console.log(`- ${error}`);
  }
  console.log("");
}

if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
  console.log("");
}

console.log("Notes:");
for (const note of notes) {
  console.log(`- ${note}`);
}

if (errors.length) {
  console.log("");
  console.log(`Result: FAILED with ${errors.length} error(s).`);
  process.exitCode = 1;
} else if (warnings.length) {
  console.log("");
  console.log(`Result: PASS with ${warnings.length} warning(s).`);
} else {
  console.log("");
  console.log("Result: PASS.");
}
