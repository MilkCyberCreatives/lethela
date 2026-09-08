import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const FREE_TIER_ENV = `
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://www.lethela.co.za
NEXTAUTH_URL=https://www.lethela.co.za
NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE=pilot
NEXTAUTH_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
PASSWORD_RESET_SECRET=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
VENDOR_SESSION_SECRET=cccccccccccccccccccccccccccccccccccccccccccc
RIDER_CONSOLE_SECRET=dddddddddddddddddddddddddddddddddddddddddddd
ADMIN_APPROVAL_KEY=eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
CRON_SECRET=ffffffffffffffffffffffffffffffffffff
BANK_DATA_ENCRYPTION_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://user:pass@db.example.co.za:5432/lethela
UPLOAD_STORAGE=supabase
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_ROLE=service-role-key-value
SUPABASE_BUCKET=lethela-public
SUPABASE_PRIVATE_BUCKET=lethela-private
STORAGE_BUCKET_URL=https://project.supabase.co/storage/v1/object/public/lethela-public
OZOW_IS_TEST=false
NEXT_PUBLIC_OZOW_IS_TEST=false
RESEND_API_KEY=re_live_key
ADMIN_NOTIFICATION_EMAIL_FROM=noreply@lethela.co.za
PASSWORD_RESET_EMAIL_FROM=noreply@lethela.co.za
ADMIN_NOTIFICATION_EMAILS=owner@lethela.co.za
`.trim();

function runCheck(env: string) {
  const file = path.join(os.tmpdir(), `lethela-check-${Date.now()}-${Math.random()}.env`);
  fs.writeFileSync(file, `${env}\n`);
  try {
    return execFileSync("node", ["scripts/check-production-env.mjs", file], {
      encoding: "utf8",
    });
  } catch (error) {
    return String((error as { stdout?: Buffer }).stdout ?? "");
  } finally {
    fs.rmSync(file, { force: true });
  }
}

test("production readiness passes in pilot mode with no Maps, no Twilio, no live payments", () => {
  const output = runCheck(FREE_TIER_ENV);
  assert.match(output, /Result: PASS/);
  assert.doesNotMatch(output, /GOOGLE_MAPS_API_KEY:.*must be set/);
  assert.doesNotMatch(output, /TWILIO_ACCOUNT_SID:.*must be set/);
  assert.doesNotMatch(output, /OZOW_SITE_CODE:.*must be set/);
});

test("public launch mode still requires live Ozow payment keys", () => {
  const output = runCheck(
    FREE_TIER_ENV.replace(
      "NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE=pilot",
      "NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE=public",
    ),
  );
  assert.match(output, /Result: FAILED/);
  assert.match(output, /OZOW_SITE_CODE/);
  assert.match(output, /OZOW_PRIVATE_KEY/);
});

test("check-production-env treats Maps and Twilio as optional warnings", () => {
  const script = source("scripts/check-production-env.mjs");
  assert.match(script, /warnIfMissing\(\s*"GOOGLE_MAPS_API_KEY"/);
  assert.match(script, /warnIfMissing\(\s*"NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"/);
  assert.match(script, /warnIfMissing\(\s*"TWILIO_ACCOUNT_SID"/);
  assert.doesNotMatch(script, /requireNonPlaceholder\(\s*"GOOGLE_MAPS_API_KEY"/);
  assert.doesNotMatch(script, /requireNonPlaceholder\(\s*"TWILIO_ACCOUNT_SID"/);
});

test("geo uses a free OpenStreetMap geocoder fallback that can be disabled for tests", () => {
  const geo = source("src/lib/geo.ts");
  assert.match(geo, /nominatim\.openstreetmap\.org/);
  assert.match(geo, /geocodeViaNominatim/);
  assert.match(geo, /reverseViaNominatim/);
  assert.match(geo, /NOMINATIM_DISABLED/);
  assert.match(geo, /countrycodes.*za|"countrycodes",\s*"za"/s);
  // Nominatim requires an identifying User-Agent.
  assert.match(geo, /"User-Agent":\s*`Lethela/);
});

test("order tracking map renders without a Google Maps key via the keyless embed", () => {
  const map = source("src/components/OrderMap.tsx");
  assert.match(map, /return "embed";/);
  assert.match(map, /output:\s*"embed"/);
  assert.match(map, /NEXT_PUBLIC_GOOGLE_MAPS_JS_MODE === "true" && shouldRenderGoogleMap/);
});

test("email channel stays on Resend with no third-party SDK dependency", () => {
  const channels = source("src/lib/notification-channels.ts");
  assert.match(channels, /export async function sendEmail/);
  assert.match(channels, /export \{ sendEmail as sendResendEmail \}/);
  assert.match(channels, /api\.resend\.com\/emails/);
  assert.doesNotMatch(channels, /nodemailer/);

  const pkg = JSON.parse(source("package.json"));
  assert.equal(pkg.dependencies.nodemailer, undefined);
});
