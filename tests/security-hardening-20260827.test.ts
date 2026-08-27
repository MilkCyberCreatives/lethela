import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("AI order tracking is restricted to the signed-in order owner", async () => {
  const file = await source("src/app/api/ai/chat/route.ts");
  assert.match(file, /import \{ auth \} from "@\/auth";/);
  assert.match(file, /getTrackedOrderSummary\(id: string, userId: string \| null\)/);
  assert.match(file, /where: \{\s*userId,\s*OR:/s);
  assert.match(file, /live order details are available only after verification/);
});

test("owner bootstrap requires the configured email allowlist", async () => {
  const file = await source("src/app/api/admin/bootstrap-owner/route.ts");
  assert.match(file, /ADMIN_BOOTSTRAP_EMAILS/);
  assert.match(file, /Owner bootstrap email allowlist is not configured/);
  assert.match(file, /allowedEmails\.includes\(parsed\.data\.email\)/);
});

test("raw admin API keys are disabled by default in production", async () => {
  const file = await source("src/lib/admin-auth.ts");
  assert.match(file, /ALLOW_PRODUCTION_ADMIN_API_KEY_AUTH/);
  assert.match(file, /allowProductionApiKeyAuth && secretsEqual/);
});

test("delivery quotes are rate limited before map-backed calculation", async () => {
  const file = await source("src/app/api/checkout/delivery-quote/route.ts");
  assert.match(file, /checkRateLimit/);
  assert.match(file, /key: "checkout-delivery-quote"/);
  assert.match(file, /status: 429/);
});

test("order tracking telemetry does not persist order references", async () => {
  const file = await source("src/app/orders/[ref]/page.tsx");
  assert.doesNotMatch(file, /trackVisitorEvent/);
  assert.doesNotMatch(file, /order_ref/);
  assert.doesNotMatch(file, /orderRef/);
  assert.match(file, /pushDataLayerEvent\("track_order_view"\)/);
});

test("legacy vendor email claims require a verified account", async () => {
  const file = await source("src/lib/authz.ts");
  assert.match(file, /select: \{ emailVerifiedAt: true \}/);
  assert.match(file, /currentUser\?\.emailVerifiedAt/);
  assert.match(file, /where: \{ id: legacyVendor\.id, ownerId: null \}/);
});

test("framework versions are pinned to patched releases", async () => {
  const pkg = JSON.parse(await source("package.json")) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  assert.equal(pkg.dependencies.next, "16.3.3");
  assert.equal(pkg.dependencies.react, "19.2.8");
  assert.equal(pkg.dependencies["react-dom"], "19.2.8");
  assert.equal(pkg.devDependencies["eslint-config-next"], "16.3.3");
});
