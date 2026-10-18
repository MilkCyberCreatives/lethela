import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("a rider's phone location reaches the orders they are delivering", async () => {
  const route = await source("src/app/api/riders/me/location/route.ts");
  assert.match(route, /shareRiderLocationWithDeliveries\(rider\.id/);
  assert.match(route, /key: `rider-location:\$\{rider\.id\}`/);
  const tracking = await source("src/lib/rider-tracking.ts");
  assert.match(
    tracking,
    /RIDER_ON_DELIVERY_STATUSES = \["RIDER_ASSIGNED", "PICKED_UP", "ON_THE_WAY"\]/,
  );
  assert.match(tracking, /assignedRiderId: riderId, status: \{ in: RIDER_ON_DELIVERY_STATUSES \}/);
  assert.match(tracking, /riderLocatedAt: at/);
  assert.match(tracking, /"location"/);
});

test("the rider dashboard shares location while online or delivering, faster on a delivery", async () => {
  const panel = await source("src/components/rider/RiderOperationsPanel.tsx");
  assert.match(panel, /const sharing = online \|\| delivering;/);
  assert.match(panel, /const every = delivering \? 10_000 : 60_000;/);
  // 10 s updates must stay inside the per-rider limit of 150 per 15 minutes.
  const route = await source("src/app/api/riders/me/location/route.ts");
  assert.match(route, /limit: 150,\s*windowMs: 15 \* 60 \* 1000/);
  const availability = await source("src/app/api/riders/me/availability/route.ts");
  assert.match(availability, /activeDelivery: activeDeliveries > 0/);
});

test("admins have a live map of riders and open deliveries", async () => {
  const route = await source("src/app/api/admin/riders/live/route.ts");
  assert.match(route, /requireAdminRequest\(req\)/);
  assert.match(route, /liveTrackingSnapshot\(\)/);
  const admin = await source("src/app/admin/page.tsx");
  assert.match(admin, /\{ id: "tracking", label: "Live map"/);
  assert.match(admin, /<AdminLiveMap/);
  const view = await source("src/components/admin/AdminLiveMap.tsx");
  assert.match(view, /\/api\/admin\/riders\/live/);
  assert.match(view, /onOpenOrder\(/);
});

test("the live map only lists riders who are online or on a delivery", async () => {
  const tracking = await source("src/lib/rider-tracking.ts");
  assert.match(tracking, /\.filter\(\(rider\) => rider\.online \|\| rider\.onDelivery\)/);
  const offers = await source("src/lib/rider-offers.ts");
  assert.match(offers, /export async function listFreshRiderLocations/);
  assert.match(offers, /WHERE located_at >= /);
});
