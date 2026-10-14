import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildRiderAssignmentMessage,
  joinAddress,
  riderDropoff,
} from "../src/lib/order-notifications";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const itemsJson = JSON.stringify({
  items: [
    { name: "Castle Lite 6 pack", qty: 1, priceCents: 10500, isAlcohol: true },
    { name: "Kota", qty: 2, priceCents: 4500 },
  ],
  deliveryDetails: {
    customerName: " Thabo  Nkosi ",
    customerPhone: "071 000 0000",
    standNumber: "Stand 12",
    streetSection: "Zone 4",
    destinationSuburb: "Klipfontein View, Midrand 1685",
    landmark: "Near the clinic",
    deliveryNotes: "Call at the gate",
  },
});

test("the assigned rider gets the customer's address, phone and notes", () => {
  assert.deepEqual(riderDropoff(itemsJson), {
    customerName: "Thabo Nkosi",
    phone: "071 000 0000",
    address: "Stand 12, Zone 4, Klipfontein View, Midrand 1685",
    landmark: "Near the clinic",
    notes: "Call at the gate",
    containsAlcohol: true,
  });
  // Older orders and broken payloads still give the rider a card.
  assert.equal(riderDropoff("not json").address, "");
  assert.equal(
    riderDropoff(JSON.stringify({ deliveryDetails: { whatsappNumber: "072 111 2222" } })).phone,
    "072 111 2222",
  );
});

test("an address part is not repeated", () => {
  assert.equal(
    joinAddress("Stand 100, Klipfontein View", "Klipfontein View", "Midrand"),
    "Stand 100, Klipfontein View, Midrand",
  );
  assert.equal(joinAddress("", null, "  Midrand "), "Midrand");
});

test("the rider's message says where to collect and deliver, without the customer's phone", () => {
  const message = buildRiderAssignmentMessage({
    orderRef: "LET-12345",
    vendorName: "Hello Tomato",
    pickupAddress: "Stand 100, Klipfontein View, Midrand",
    dropoff: riderDropoff(itemsJson),
    earnCents: 2300,
    dashboardUrl: "https://www.lethela.co.za/rider/dashboard",
  });
  assert.match(message, /^New Lethela delivery for you: LET-12345$/m);
  assert.match(message, /^Collect from: Hello Tomato, Stand 100, Klipfontein View, Midrand$/m);
  assert.match(message, /^Deliver to: Stand 12, Zone 4, Klipfontein View, Midrand 1685$/m);
  assert.match(message, /^Landmark: Near the clinic$/m);
  assert.match(message, /^Liquor order: check the customer's ID at handover\.$/m);
  assert.match(message, /^You earn: R23\.00$/m);
  assert.match(message, /https:\/\/www\.lethela\.co\.za\/rider\/dashboard$/m);
  assert.doesNotMatch(message, /071 000 0000|Thabo/);
});

test("assigning a rider in Operations messages the rider once", async () => {
  const route = await source("src/app/api/admin/operations/route.ts");
  assert.match(
    route,
    /action: "assign_rider"[\s\S]*await notifyRiderOfAssignment\(order\.id, rider\.id\)\.catch\(\(\) => null\);/,
  );
  const lib = await source("src/lib/order-notifications.ts");
  assert.match(
    lib,
    /claimOrderNotification\(orderId, `rider-assigned:\$\{riderApplicationId\}`, "rider"\)/,
  );
  for (const channel of [
    /createNotification\(\{\s*userId: rider\.userId,/,
    /sendPushToUsers\(\[rider\.userId\], "orderUpdatesEnabled"/,
    /subject: `New delivery for you: \$\{orderRef\}`/,
    /sendTwilioWhatsApp\(\{ to: phone, body: text \}\)/,
  ]) {
    assert.match(lib, channel);
  }
});

test("the rider dashboard shows where to deliver and who to call", async () => {
  const api = await source("src/app/api/riders/me/route.ts");
  assert.match(api, /assignedRiderId: application\?\.id \|\| "__none__"/);
  assert.match(api, /dropoff: riderDropoff\(order\.itemsJson\)/);
  assert.match(api, /vendorPhone: order\.vendor\?\.phone \|\| null/);
  const card = await source("src/components/rider/RiderDashboardClient.tsx");
  assert.match(card, /Deliver to \{order\.dropoff\.address/);
  assert.match(card, /href=\{telHref\(order\.dropoff\.phone\)\}/);
  assert.match(card, /Liquor order: check the customer&apos;s ID at handover\./);
});

test("the launch checklist counts menu items as well as products", async () => {
  const page = await source("src/app/admin/launch-checklist/page.tsx");
  assert.match(
    page,
    /prisma\.item\.count\(\{ where: \{ draft: false, isAlcohol: false, vendor: approvedStore \} \}\)/,
  );
  assert.match(page, /const activeItems = activeProducts \+ menuItems;/);
  assert.doesNotMatch(page, /activeProducts >= /);
});
