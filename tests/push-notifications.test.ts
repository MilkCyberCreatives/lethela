import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { hasWebPushConfig } from "../src/lib/web-push";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("web push is self-hosted VAPID with no third-party push SDK", async () => {
  const [webPush, deps] = await Promise.all([
    source("src/lib/web-push.ts"),
    source("package.json"),
  ]);
  // Uses the standard web-push VAPID protocol, not a hosted SaaS SDK.
  assert.match(webPush, /import webpush from "web-push"/);
  assert.match(webPush, /webpush\.setVapidDetails\(/);
  assert.match(webPush, /webpush\.sendNotification\(/);
  const packageJson = JSON.parse(deps);
  assert.ok(packageJson.dependencies["web-push"], "web-push must be a dependency");
  for (const banned of ["onesignal", "firebase", "@firebase", "pushwoosh", "airship"]) {
    assert.ok(
      !packageJson.dependencies[banned],
      `push must not depend on the third-party service ${banned}`,
    );
  }
});

test("hasWebPushConfig reflects the VAPID keypair environment", () => {
  const originalPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const originalPrivate = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  try {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
    assert.equal(hasWebPushConfig(), false);

    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    assert.equal(hasWebPushConfig(), false, "one key alone must not enable push");

    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = "private-key";
    assert.equal(hasWebPushConfig(), true);
  } finally {
    if (originalPublic === undefined) delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    else process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalPublic;
    if (originalPrivate === undefined) delete process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
    else process.env.WEB_PUSH_VAPID_PRIVATE_KEY = originalPrivate;
  }
});

test("delivery drops subscriptions the push service reports as gone (404/410)", async () => {
  const lib = await source("src/lib/push-notifications.ts");
  assert.match(lib, /statusCode === 404 \|\| statusCode === 410/);
  assert.match(
    lib,
    /prisma\.pushSubscription\.deleteMany\(\{\s*where: \{ endpoint: subscription\.endpoint \}/s,
  );
});

test("the send endpoint is admin-guarded and requires configured keys", async () => {
  const route = await source("src/app/api/push/notify/route.ts");
  assert.match(route, /requireAdminRequest\(req, "notifications:send"\)/);
  assert.match(route, /if \(!hasWebPushConfig\(\)\)/);
  assert.match(route, /prisma\.pushCampaign\.create\(/);
});

test("order status changes push the customer and the vendor", async () => {
  const orders = await source("src/lib/order-notifications.ts");
  assert.match(orders, /sendPushToUsers\(\[order\.userId\], "orderUpdatesEnabled"/);
  assert.match(orders, /sendPushToUsers\(vendorUserIds, "orderUpdatesEnabled"/);
});

test("the admin dashboard can compose and send a push campaign", async () => {
  const admin = await source("src/app/admin/page.tsx");
  assert.match(admin, /const sendPushCampaign = useCallback/);
  assert.match(admin, /fetch\("\/api\/push\/notify"/);
  assert.match(admin, /webPushConfigured/);
  assert.match(admin, /Send a broadcast push/);
});

test("the service worker survives subscription rotation and updates promptly", async () => {
  const [sw, vapid] = await Promise.all([
    source("public/push-sw.js"),
    source("src/app/api/push/vapid/route.ts"),
  ]);
  // New worker versions take over open pages without waiting for a full close.
  assert.match(sw, /addEventListener\("install",\s*\(\)\s*=>\s*self\.skipWaiting\(\)\)/);
  assert.match(sw, /self\.clients\.claim\(\)/);
  // Rotated subscriptions are re-registered with the server.
  assert.match(sw, /addEventListener\("pushsubscriptionchange"/);
  assert.match(sw, /fetch\("\/api\/push\/subscribe"/);
  assert.match(sw, /fetch\("\/api\/push\/vapid"/);
  // Clicking a notification reuses an existing tab instead of stacking new ones.
  assert.match(sw, /self\.clients\.matchAll\(\{ type: "window"/);
  // The VAPID endpoint only ever exposes the already-public key.
  assert.match(vapid, /NEXT_PUBLIC_VAPID_PUBLIC_KEY/);
  assert.doesNotMatch(vapid, /VAPID_PRIVATE_KEY/);
});
