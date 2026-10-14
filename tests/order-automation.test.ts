import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const rider = (id: string, suburb: string, city = "Ekurhuleni", preferredZones = "[]") => ({
  id,
  suburb,
  city,
  township: "",
  preferredZones,
});

test("riders in the store's suburb or zones are offered the order first", async () => {
  const { rankRiders } = await import("../src/lib/order-automation");
  const ranked = rankRiders(
    [
      rider("far", "Soweto", "Johannesburg"),
      rider("city", "Tembisa"),
      rider("zone", "Tembisa", "Ekurhuleni", '["Klipfontein View"]'),
      rider("local", "klipfontein view"),
    ],
    { suburb: "Klipfontein View", city: "Ekurhuleni" },
    new Map([["local", 3]]),
  );
  assert.deepEqual(
    ranked.map((row) => row.id),
    ["zone", "local", "city", "far"],
  );
});

test("riders with fewer deliveries today come first among equals", async () => {
  const { rankRiders } = await import("../src/lib/order-automation");
  const ranked = rankRiders(
    [rider("busy", "Klipfontein View"), rider("quiet", "Klipfontein View")],
    { suburb: "Klipfontein View", city: "Ekurhuleni" },
    new Map([["busy", 4]]),
  );
  assert.equal(ranked[0].id, "quiet");
});

test("a ready order is given to a rider automatically by every route that marks it ready", async () => {
  for (const path of [
    "src/app/api/vendors/orders/[id]/route.ts",
    "src/app/api/orders/[ref]/status/route.ts",
    "src/app/api/admin/operations/route.ts",
  ]) {
    const file = await source(path);
    assert.match(file, /READY_FOR_PICKUP"\) \{\s*await dispatchReadyOrder\(order\.id\)/, path);
  }
});

test("only free, online, approved riders who have not declined are offered an order", async () => {
  const file = await source("src/lib/order-automation.ts");
  assert.match(file, /status: "APPROVED", availableNow: true/);
  assert.match(file, /RIDER_ASSIGNMENT_DECLINED/);
  assert.match(file, /!busyIds\.has\(rider\.id\) && !declined\.has\(rider\.id\)/);
  // Two requests can never give the same order to two riders.
  assert.match(
    file,
    /where: \{ id: order\.id, status: "READY_FOR_PICKUP", assignedRiderId: null \}/,
  );
});

test("waiting orders are offered when a rider comes online or finishes a delivery", async () => {
  const availability = await source("src/app/api/riders/me/availability/route.ts");
  assert.match(availability, /if \(updated\.availableNow\) \{\s*await dispatchWaitingOrders\(\)/);
  const status = await source("src/app/api/orders/[ref]/status/route.ts");
  assert.match(
    status,
    /RIDER_FREED_STATUSES: string\[\] = \["DELIVERED", "READY_FOR_PICKUP", "CANCELLED"\]/,
  );
  assert.match(
    status,
    /RIDER_FREED_STATUSES\.includes\(canonicalStatus\)\) \{\s*await dispatchWaitingOrders\(\)/,
  );
});

test("the order sweep runs from pages people keep open", async () => {
  for (const path of [
    "src/app/api/notifications/route.ts",
    "src/app/api/admin/operations/route.ts",
    "src/app/api/orders/[ref]/route.ts",
  ]) {
    assert.match(await source(path), /scheduleOrderSweep\(\);/, path);
  }
});

test("the order sweep also runs on a schedule when no page is open", async () => {
  const route = await source("src/app/api/cron/order-sweep/route.ts");
  assert.match(route, /await runOrderSweep\(\)/);
  assert.doesNotMatch(route, /assigned|reminders|escalations/);
  const workflow = await source(".github/workflows/order-sweep.yml");
  assert.match(workflow, /cron: "\*\/5 \* \* \* \*"/);
  assert.match(workflow, /https:\/\/www\.lethela\.co\.za\/api\/cron\/order-sweep/);
});

test("slow stores and riders are reminded before admins are told", async () => {
  const {
    STORE_REMINDER_AFTER_MS,
    STORE_ESCALATE_AFTER_MS,
    RIDER_REMINDER_AFTER_MS,
    RIDER_ESCALATE_AFTER_MS,
  } = await import("../src/lib/order-automation");
  assert.ok(STORE_REMINDER_AFTER_MS < STORE_ESCALATE_AFTER_MS);
  assert.ok(RIDER_REMINDER_AFTER_MS < RIDER_ESCALATE_AFTER_MS);
  const file = await source("src/lib/order-automation.ts");
  assert.match(file, /claimOrderNotification\(order\.id, "store-reminder", "auto"\)/);
  assert.match(file, /notifyAdminsOfOrder\(order\.id, "store-slow"\)/);
  assert.match(file, /notifyAdminsOfOrder\(order\.id, "rider-slow"\)/);
});

test("the customer is told when their order is cancelled", async () => {
  const { buildCustomerCancellationMessage } = await import("../src/lib/order-notifications");
  const text = buildCustomerCancellationMessage({
    orderRef: "LET-123",
    vendorName: "Mama's Kitchen",
    reason: "Out of stock",
    paid: true,
    totalCents: 8550,
    orderUrl: "https://www.lethela.co.za/orders/LET-123",
  });
  assert.match(text, /LET-123 from Mama's Kitchen has been cancelled/);
  assert.match(text, /Reason: Out of stock/);
  assert.match(text, /You paid R85\.50\. We will refund you/);

  const file = await source("src/lib/order-notifications.ts");
  assert.match(
    file,
    /notifyAdminsOfOrder\(orderId, "cancelled"\),\s*notifyCustomerOfCancellation\(orderId\)/,
  );
  const admin = await source("src/app/api/admin/operations/route.ts");
  assert.match(admin, /notifyCustomerOfCancellation\(order\.id\)/);
});
