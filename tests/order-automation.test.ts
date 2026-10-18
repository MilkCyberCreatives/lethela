import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const rider = (
  id: string,
  suburb: string,
  city = "Ekurhuleni",
  preferredZones = "[]",
  distanceKm: number | null = null,
) => ({ id, suburb, city, township: "", preferredZones, distanceKm });

const store = { suburb: "Klipfontein View", city: "Ekurhuleni", latitude: -26.1, longitude: 28.2 };

test("riders closest to the store by phone location come first, then its suburb or zones", async () => {
  const { rankRiders } = await import("../src/lib/rider-offers");
  const ranked = rankRiders(
    [
      rider("far", "Soweto", "Johannesburg"),
      rider("city", "Tembisa"),
      rider("zone", "Tembisa", "Ekurhuleni", '["Klipfontein View"]'),
      rider("gps-2km", "Tembisa", "Ekurhuleni", "[]", 2),
      rider("gps-1km", "Soweto", "Johannesburg", "[]", 0.8),
      rider("gps-8km", "Klipfontein View", "Ekurhuleni", "[]", 8),
    ],
    store,
    new Map(),
  );
  assert.deepEqual(
    ranked.map((row) => row.id),
    ["gps-1km", "gps-2km", "zone", "gps-8km", "city", "far"],
  );
});

test("a rider's phone location beats their saved suburb when deciding who is nearby", async () => {
  const { isNearby, NEARBY_KM } = await import("../src/lib/rider-offers");
  assert.equal(isNearby(rider("a", "Klipfontein View", "x", "[]", NEARBY_KM + 1), store), false);
  assert.equal(isNearby(rider("b", "Soweto", "x", "[]", NEARBY_KM - 1), store), true);
  assert.equal(isNearby(rider("c", "klipfontein view"), store), true);
  assert.equal(isNearby(rider("d", "Soweto"), store), false);
});

test("riders with fewer deliveries today come first among equals", async () => {
  const { rankRiders } = await import("../src/lib/rider-offers");
  const ranked = rankRiders(
    [rider("busy", "Klipfontein View"), rider("quiet", "Klipfontein View")],
    store,
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

test("only free, online, approved riders who have not declined are alerted", async () => {
  const file = await source("src/lib/rider-offers.ts");
  assert.match(file, /status: "APPROVED", availableNow: true/);
  assert.match(file, /RIDER_ASSIGNMENT_DECLINED/);
  assert.match(file, /!busy\.has\(rider\.id\) && !declined\.has\(rider\.id\)/);
  assert.match(file, /rider\.distanceKm <= MAX_OFFER_KM/);
});

test("the first rider to accept gets the order, and only one can win", async () => {
  const file = await source("src/lib/rider-offers.ts");
  assert.match(
    file,
    /where: \{ id: order\.id, status: "READY_FOR_PICKUP", assignedRiderId: null \}/,
  );
  assert.match(file, /if \(claimed\.count === 0\) return "taken";/);
  assert.match(file, /await closeOpenOffers\(order\.id, rider\.id\)/);
  const route = await source("src/app/api/riders/me/offers/[ref]/route.ts");
  assert.match(route, /Another rider accepted this delivery first\./);
});

test("nobody accepting widens the request and then tells admins", async () => {
  const { WIDEN_AFTER_MS, NO_ACCEPT_ALERT_AFTER_MS } = await import("../src/lib/rider-offers");
  assert.ok(WIDEN_AFTER_MS < NO_ACCEPT_ALERT_AFTER_MS);
  const file = await source("src/lib/order-automation.ts");
  assert.match(file, /offerOrder\(order\.id, \{ widen: true \}\)/);
  assert.match(file, /notifyAdminsOfOrder\(order\.id, "no-rider-accepted"\)/);
  // Admins hear straight away only when no rider could be alerted.
  assert.match(file, /alertAdmins: !ridersAlerted/);
});

test("riders see the customer's details only after they accept", async () => {
  const offers = await source("src/lib/rider-offers.ts");
  const listing = offers.slice(offers.indexOf("export async function listRiderOffers"));
  assert.doesNotMatch(listing, /customerName|customerPhone|whatsappNumber|standNumber/);
  const { buildRiderOfferMessage } = await import("../src/lib/order-notifications");
  const text = buildRiderOfferMessage({
    orderRef: "LET-9",
    vendorName: "Mama's Kitchen",
    pickupAddress: "12 Main Rd, Klipfontein View",
    dropoffArea: "Klipfontein View",
    distanceKm: 1.24,
    earnCents: 2300,
    dashboardUrl: "https://www.lethela.co.za/rider/dashboard",
  });
  assert.match(text, /\(1\.2 km from you\)/);
  assert.match(text, /The first rider to tap Accept gets it\./);
  assert.match(text, /You earn: R23\.00/);
});

test("riders are only located while online", async () => {
  const location = await source("src/app/api/riders/me/location/route.ts");
  assert.match(location, /if \(rider\.availableNow\) \{\s*await saveRiderLocation/);
  const availability = await source("src/app/api/riders/me/availability/route.ts");
  assert.match(availability, /clearRiderLocation\(application\.id\)/);
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
