import fs from "node:fs";
import path from "node:path";

const PLACEHOLDER_PATTERNS = [/^replace-with/i, /^your-/i, /^example$/i, /^example\./i];

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

function isTruthy(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function isVercelDeployment(values) {
  return (
    isTruthy(read("VERCEL", values)) ||
    Boolean(read("VERCEL_ENV", values)) ||
    Boolean(read("VERCEL_URL", values))
  );
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
  "must be set to your public canonical HTTPS domain.",
);
if (publicSiteUrl && !isHttpsUrl(publicSiteUrl)) {
  errors.push("NEXT_PUBLIC_SITE_URL: must be a valid HTTPS URL.");
}

const nextAuthUrl = requireNonPlaceholder(
  "NEXTAUTH_URL",
  "must be set to your public canonical HTTPS domain.",
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
  "must be set to sqlite or postgresql for a live deployment.",
);
if (databaseProvider && !["sqlite", "postgresql"].includes(databaseProvider)) {
  errors.push("DATABASE_PROVIDER: must be either 'sqlite' or 'postgresql'.");
}

const databaseUrl = requireNonPlaceholder(
  "DATABASE_URL",
  "must point to your production PostgreSQL database.",
);

if (databaseUrl && databaseProvider === "postgresql") {
  const normalizedUrl = databaseUrl.toLowerCase();
  if (!(normalizedUrl.startsWith("postgres://") || normalizedUrl.startsWith("postgresql://"))) {
    errors.push("DATABASE_URL: must be a PostgreSQL connection string for production.");
  }
}

if (databaseUrl && databaseProvider === "sqlite") {
  if (/^file:\.\.?\//.test(databaseUrl) || databaseUrl === "file:./dev.db") {
    errors.push("DATABASE_URL: production SQLite must use an absolute persistent path.");
  }
  if (!databaseUrl.startsWith("file:") || !isAbsoluteSqliteUrl(databaseUrl)) {
    errors.push("DATABASE_URL: production SQLite must look like file:/absolute/path/lethela.db.");
  }
}

requireNonPlaceholder(
  "GOOGLE_MAPS_API_KEY",
  "must be set for server-side geocoding and delivery quotes.",
);
requireNonPlaceholder("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "must be set for live browser maps.");

const uploadStorage = read("UPLOAD_STORAGE", values) || "local";
if (!["local", "supabase"].includes(uploadStorage)) {
  errors.push("UPLOAD_STORAGE: must be either 'local' or 'supabase'.");
}

if (uploadStorage === "local" && isVercelDeployment(values)) {
  errors.push(
    "UPLOAD_STORAGE: local uploads are not durable on Vercel/serverless. Use UPLOAD_STORAGE=supabase for this deployment.",
  );
}

if (uploadStorage === "supabase") {
  requireNonPlaceholder("SUPABASE_URL", "must be set for Supabase uploads.");
  requireNonPlaceholder("SUPABASE_SERVICE_ROLE", "must be set for Supabase uploads.");
  requireNonPlaceholder("SUPABASE_BUCKET", "must be set for Supabase uploads.");
  const storageBucketUrl = requireNonPlaceholder(
    "STORAGE_BUCKET_URL",
    "should be set so uploaded media resolves to an absolute public URL.",
  );
  if (storageBucketUrl && !isHttpsUrl(storageBucketUrl)) {
    errors.push("STORAGE_BUCKET_URL: must be a valid HTTPS URL.");
  }
} else {
  requireNonPlaceholder("STORAGE_LOCAL_DIR", "must be set to a persistent absolute upload folder.");
  requireNonPlaceholder("STORAGE_PUBLIC_PATH", "must be set to the public upload URL path.");
}

requireNonPlaceholder("OZOW_SITE_CODE", "must be set for live payments.");
requireNonPlaceholder("OZOW_PRIVATE_KEY", "must be set for live payments.");

const ozowIsTest = requireNonPlaceholder("OZOW_IS_TEST", "must be set to false in production.");
if (ozowIsTest && ozowIsTest !== "false") {
  errors.push("OZOW_IS_TEST: must be exactly 'false' for live payments.");
}

const nextPublicOzowIsTest = requireNonPlaceholder(
  "NEXT_PUBLIC_OZOW_IS_TEST",
  "must be set to false in production.",
);
if (nextPublicOzowIsTest && nextPublicOzowIsTest !== "false") {
  errors.push("NEXT_PUBLIC_OZOW_IS_TEST: must be exactly 'false' for live checkout.");
}

if (
  isTruthy(read("DEMO_CATALOG_MODE", values)) ||
  isTruthy(read("FORCE_CATALOG_FALLBACK", values))
) {
  errors.push(
    "DEMO_CATALOG_MODE/FORCE_CATALOG_FALLBACK: demo catalog mode must be disabled for a live launch.",
  );
}

if (isTruthy(read("ALLOW_PRODUCTION_DEMO_CATALOG", values))) {
  warnings.push("ALLOW_PRODUCTION_DEMO_CATALOG: should be unset for a real launch.");
}

warnIfMissing(
  "PASSWORD_RESET_SECRET",
  "recommended so password reset does not rely on NEXTAUTH_SECRET.",
);
warnIfMissing(
  "PASSWORD_RESET_EMAIL_FROM",
  "recommended if you want public password reset emails to work.",
);
requireNonPlaceholder(
  "RESEND_API_KEY",
  "must be set so vendor and rider applicants receive email confirmations and approval notices.",
);
const notificationEmailFrom =
  read("ADMIN_NOTIFICATION_EMAIL_FROM", values) || read("PASSWORD_RESET_EMAIL_FROM", values);
if (looksLikePlaceholder(notificationEmailFrom)) {
  errors.push(
    "ADMIN_NOTIFICATION_EMAIL_FROM/PASSWORD_RESET_EMAIL_FROM: at least one verified sender must be set for applicant emails.",
  );
}
const adminNotificationRecipients =
  read("ADMIN_NOTIFICATION_EMAILS", values) || read("ADMIN_NOTIFICATION_WHATSAPP_TO", values);
if (looksLikePlaceholder(adminNotificationRecipients)) {
  errors.push(
    "ADMIN_NOTIFICATION_EMAILS/ADMIN_NOTIFICATION_WHATSAPP_TO: at least one owner notification recipient must be set.",
  );
}
requireNonPlaceholder(
  "TWILIO_ACCOUNT_SID",
  "must be set so vendor and rider applicants receive WhatsApp confirmations and approval notices.",
);
requireNonPlaceholder("TWILIO_AUTH_TOKEN", "must be set for WhatsApp notifications.");
requireNonPlaceholder("TWILIO_WHATSAPP_FROM", "must be set to a Twilio WhatsApp sender.");
warnIfMissing("PUSHER_APP_ID", "recommended if you want realtime updates.");
warnIfMissing("PUSHER_KEY", "recommended if you want realtime updates.");
warnIfMissing("PUSHER_SECRET", "recommended if you want realtime updates.");
warnIfMissing("NEXT_PUBLIC_PUSHER_KEY", "recommended if you want realtime updates.");
warnIfMissing("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "recommended if you want web push.");
warnIfMissing("WEB_PUSH_VAPID_PRIVATE_KEY", "recommended if you want web push.");
warnIfMissing("SENTRY_DSN", "recommended for production error monitoring.");
warnIfMissing("SENTRY_ENVIRONMENT", "recommended for production error monitoring.");
warnIfMissing("NEXT_PUBLIC_SUPPORT_EMAIL", "recommended for legal and support pages.");

notes.push("SQLite is acceptable only on a single persistent server with backups.");
notes.push("PostgreSQL or managed object storage is still recommended once traffic grows.");
notes.push("Order tracking references should be treated as secrets.");
notes.push(
  "Server-action origins are derived from NEXT_PUBLIC_SITE_URL, NEXTAUTH_URL, and VERCEL_URL.",
);

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
