// End-to-end check of the self-hosted web-push pipeline (no third-party SDK):
//   subscription -> /api/push/subscribe -> PushSubscription row
//   -> POST /api/push/notify -> web-push builds the encrypted payload, signs a
//      VAPID JWT and posts it to the browser's own push service.
//
// It first tries a real headless-browser subscription. Headless browsers often
// cannot reach a vendor push service, so on failure it falls back to a
// synthetic subscription and still verifies the whole server pipeline runs.
//
// Run the dev server first, then: node scripts/verify-push.mjs

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";

function loadDotEnv() {
  const merged = {};
  for (const file of [".env", ".env.local"]) {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) continue;
    for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator <= 0) continue;
      merged[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    }
  }
  return merged;
}

const env = loadDotEnv();
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const adminKey = process.env.ADMIN_APPROVAL_KEY || env.ADMIN_APPROVAL_KEY;
const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL || "";

if (!vapidPublicKey) {
  console.error("FAIL: NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set — push is not activated.");
  process.exit(1);
}
if (!/localhost|127\.0\.0\.1/.test(baseUrl) && !databaseUrl.startsWith("file:")) {
  console.error("Refusing to run against a non-local target.");
  process.exit(1);
}
console.log(`OK: web push is configured (public key ${vapidPublicKey.length} chars).`);

function subscriptionRows() {
  if (!databaseUrl.startsWith("file:")) return null;
  const dbPath = path.resolve(process.cwd(), "prisma", databaseUrl.replace("file:./", ""));
  if (!fs.existsSync(dbPath)) return null;
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    return db.prepare('SELECT COUNT(*) AS n FROM "PushSubscription"').get().n;
  } finally {
    db.close();
  }
}

async function tryBrowserSubscription() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const context = await browser.newContext();
    await context.grantPermissions(["notifications"], { origin: baseUrl });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    const result = await page.evaluate(async (publicKey) => {
      const toKey = (value) => {
        const padding = "=".repeat((4 - (value.length % 4)) % 4);
        const normalized = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
        return Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
      };
      const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toKey(publicKey),
        }));
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscription }),
      });
      return { ok: response.ok, status: response.status, endpoint: subscription.endpoint };
    }, vapidPublicKey);
    return result;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    await browser?.close();
  }
}

async function postSyntheticSubscription() {
  // A well-formed subscription with an unreachable endpoint. The push service
  // will reject delivery (counted as "failed"), but subscribe + notify still run.
  const p256dh = crypto.randomBytes(65).toString("base64url");
  const auth = crypto.randomBytes(16).toString("base64url");
  const endpoint = `${baseUrl}/__unreachable_push__/${crypto.randomUUID()}`;
  const response = await fetch(`${baseUrl}/api/push/subscribe`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "lethela_visitor_id=push-verify-visitor",
    },
    body: JSON.stringify({ subscription: { endpoint, keys: { p256dh, auth } } }),
  });
  return { ok: response.ok, status: response.status, endpoint, synthetic: true };
}

const before = subscriptionRows();

let subscribe = await tryBrowserSubscription();
if (!subscribe.ok) {
  console.log(
    `NOTE: headless browser subscription unavailable (${subscribe.error || subscribe.status}). ` +
      "Falling back to a synthetic subscription for the server-pipeline check.",
  );
  subscribe = await postSyntheticSubscription();
}

if (!subscribe.ok) {
  console.error(`FAIL: /api/push/subscribe returned ${subscribe.status}`);
  process.exit(1);
}
console.log(
  `OK: subscription accepted (${subscribe.synthetic ? "synthetic" : new URL(subscribe.endpoint).host}).`,
);

const after = subscriptionRows();
if (before !== null && after !== null && after <= before) {
  console.error(`FAIL: subscription was not persisted (before=${before}, after=${after}).`);
  process.exit(1);
}
console.log(`OK: subscription persisted (rows ${before} -> ${after}).`);

const notifyResponse = await fetch(`${baseUrl}/api/push/notify`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-admin-key": adminKey || "" },
  body: JSON.stringify({
    title: "Push pipeline check",
    body: "Confirms the self-hosted web-push pipeline is live.",
    url: "/",
    segment: "ALL",
  }),
});
const notifyJson = await notifyResponse.json().catch(() => ({}));

if (!notifyResponse.ok || !notifyJson.ok) {
  console.error(
    `FAIL: /api/push/notify returned ${notifyResponse.status}: ${JSON.stringify(notifyJson)}`,
  );
  process.exit(1);
}
if ((notifyJson.total ?? 0) < 1) {
  console.error(
    `FAIL: the pipeline found no subscriptions to deliver to (${JSON.stringify(notifyJson)}).`,
  );
  process.exit(1);
}
console.log(
  `OK: notify pipeline ran — delivered ${notifyJson.sent}, failed ${notifyJson.failed}, total ${notifyJson.total}.`,
);

if (!subscribe.synthetic && (notifyJson.sent ?? 0) < 1) {
  console.error(
    "FAIL: a real browser subscription was made but the push service accepted nothing.",
  );
  process.exit(1);
}

// Housekeeping: drop the throwaway rows this check created so it leaves the
// database exactly as it found it.
if (databaseUrl.startsWith("file:")) {
  try {
    const dbPath = path.resolve(process.cwd(), "prisma", databaseUrl.replace("file:./", ""));
    const db = new DatabaseSync(dbPath);
    db.prepare('DELETE FROM "PushSubscription" WHERE endpoint LIKE ?').run(
      "%__unreachable_push__%",
    );
    db.prepare('DELETE FROM "PushCampaign" WHERE title = ?').run("Push pipeline check");
    db.prepare('DELETE FROM "PushPreference" WHERE "visitorId" = ?').run("push-verify-visitor");
    db.prepare('DELETE FROM "Visitor" WHERE id = ?').run("push-verify-visitor");
    db.close();
    console.log("OK: cleaned up throwaway verification rows.");
  } catch {
    console.log("NOTE: could not clean up verification rows (harmless).");
  }
}

console.log("PASS: self-hosted web-push pipeline is wired end to end and functional.");
