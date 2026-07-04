import fs from "node:fs";
import path from "node:path";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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

const envFile = process.argv[2] || ".env.production";
const env = { ...process.env, ...parseEnvFile(path.resolve(process.cwd(), envFile)) };
const rawSiteUrl =
  process.argv[3] ||
  env.OPERATING_READINESS_URL ||
  env.NEXT_PUBLIC_SITE_URL ||
  env.NEXTAUTH_URL ||
  env.VERCEL_PROJECT_PRODUCTION_URL ||
  env.VERCEL_URL ||
  "";
const siteUrl = (rawSiteUrl.startsWith("http") ? rawSiteUrl : `https://${rawSiteUrl}`).replace(
  /\/$/,
  "",
);
const adminKey = env.ADMIN_APPROVAL_KEY || "";

if (!siteUrl || !siteUrl.startsWith("https://")) {
  console.error("NEXT_PUBLIC_SITE_URL or NEXTAUTH_URL must be set to the live HTTPS domain.");
  process.exit(1);
}

if (!adminKey) {
  console.error("ADMIN_APPROVAL_KEY is required to call the owner readiness API.");
  process.exit(1);
}

const response = await fetch(`${siteUrl}/api/ops/launch-readiness`, {
  headers: { "x-admin-key": adminKey },
});
const json = await response.json().catch(() => null);

if (!response.ok || !json?.checks) {
  console.error(`Readiness API failed with HTTP ${response.status}.`);
  if (json?.error) console.error(json.error);
  process.exit(1);
}

const requiredFailures = json.checks.filter((check) => check.severity === "required" && !check.ok);
const recommendedFailures = json.checks.filter(
  (check) => check.severity === "recommended" && !check.ok,
);

console.log(`Operating readiness for ${siteUrl}`);
console.log(
  `Required: ${json.summary.requiredReady}/${json.summary.requiredTotal}. Recommended: ${json.summary.recommendedReady}/${json.summary.recommendedTotal}.`,
);
console.log(
  `Live counts: ${json.summary.activeVendors} vendor(s), ${json.summary.activeProducts} product(s), ${json.summary.approvedRiders} rider(s), ${json.summary.paidOrders} paid proof order(s).`,
);

if (requiredFailures.length) {
  console.log("");
  console.log("Required action:");
  for (const check of requiredFailures) {
    console.log(`- ${check.label}: ${check.detail}`);
  }
}

if (recommendedFailures.length) {
  console.log("");
  console.log("Recommended action:");
  for (const check of recommendedFailures) {
    console.log(`- ${check.label}: ${check.detail}`);
  }
}

if (requiredFailures.length) {
  console.log("");
  console.log("Result: NOT READY for controlled pilot operations.");
  process.exit(1);
}

console.log("");
console.log("Result: READY for controlled pilot operations.");
