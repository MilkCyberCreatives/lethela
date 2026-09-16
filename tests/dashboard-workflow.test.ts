import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("vendor orders are grouped around operational work instead of raw status codes", async () => {
  const orders = await source("src/components/dashboard/OrdersManager.tsx");

  assert.match(
    orders,
    /type WorkflowFilter = "ACTION" \| "DELIVERY" \| "EXCEPTIONS" \| "COMPLETED" \| "ALL"/,
  );
  assert.match(orders, /label: "Needs action"/);
  assert.match(orders, /label: "In delivery"/);
  assert.match(orders, /label: "Exceptions"/);
  assert.match(orders, /label: "Completed"/);
  assert.match(orders, /Next action/);
  assert.match(orders, /Open priority order/);
  assert.match(orders, /Accept order/);
  assert.match(orders, /Start preparing/);
  assert.match(orders, /Ready for rider/);
});

test("vendor order workflow keeps the existing authenticated mutation path", async () => {
  const orders = await source("src/components/dashboard/OrdersManager.tsx");

  assert.match(orders, /fetch\(`\/api\/vendors\/orders\/\$\{encodeURIComponent\(publicId\)\}`/);
  assert.match(orders, /method: "PATCH"/);
  assert.match(orders, /body: JSON\.stringify\(\{ status, reason \}\)/);
  assert.match(orders, /document\.visibilityState !== "visible"/);
});

test("rider dashboard puts the next operational step before secondary information", async () => {
  const rider = await source("src/components/rider/RiderDashboardClient.tsx");

  assert.match(rider, /Next step/);
  assert.match(rider, /Continue delivery/);
  assert.match(rider, /Ready for work/);
  assert.match(rider, /Use Shift status above to go online/);
  assert.match(rider, /Open rider console/);
  assert.match(rider, /Open profile & documents/);
  assert.match(rider, /riderOrderPriority/);
});

test("rider workflow does not add customer delivery identity fields", async () => {
  const rider = await source("src/components/rider/RiderDashboardClient.tsx");

  assert.doesNotMatch(rider, /customerPhone/);
  assert.doesNotMatch(rider, /customerEmail/);
  assert.doesNotMatch(rider, /destinationAddress/);
  assert.match(rider, /pickupArea/);
  assert.match(rider, /riderPayoutCents/);
});

test("owner dashboard retains action-first operational queues", async () => {
  const admin = await source("src/app/admin/page.tsx");

  assert.match(admin, /title="Immediate operations"/);
  assert.match(admin, /NeedsAttentionQueue/);
  assert.match(admin, /Pending vendor approvals/);
  assert.match(admin, /Orders needing action/);
});
