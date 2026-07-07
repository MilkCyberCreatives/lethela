import test from "node:test";
import assert from "node:assert/strict";
import { buildVendorOrderWhatsAppMessage, parseOrderPayload } from "../src/lib/order-notifications";

test("buildVendorOrderWhatsAppMessage gives vendors actionable order details", () => {
  const message = buildVendorOrderWhatsAppMessage({
    orderRef: "LET-12345",
    vendorName: "Lethela Bottle Store",
    totalCents: 42800,
    deliveryFeeCents: 2800,
    dashboardUrl: "https://www.lethela.co.za/vendors/dashboard",
    deliveryDetails: {
      customerName: "Thabo Nkosi",
      customerPhone: "071 000 0000",
      standNumber: "Stand 12",
      streetSection: "Zone 4",
      destinationSuburb: "Ga-Rankuwa",
      landmark: "Near the clinic",
      deliveryNotes: "Call at the gate",
      containsAlcohol: true,
    },
    items: [
      { name: "Castle Lite 6 pack", qty: 2, priceCents: 10500, isAlcohol: true },
      { name: "Ice cubes", qty: 1, priceCents: 2500 },
    ],
  });

  assert.match(message, /New paid Lethela order/);
  assert.match(message, /LET-12345/);
  assert.match(message, /Thabo Nkosi/);
  assert.match(message, /071 000 0000/);
  assert.match(message, /Stand 12, Zone 4, Ga-Rankuwa/);
  assert.match(message, /2 x Castle Lite 6 pack/);
  assert.match(message, /Total paid: R428\.00/);
  assert.match(message, /Liquor order — ID check required/);
  assert.match(message, /https:\/\/www\.lethela\.co\.za\/vendors\/dashboard/);
});

test("parseOrderPayload supports the current structured order payload", () => {
  const parsed = parseOrderPayload(
    JSON.stringify({
      items: [{ name: "Milk", qty: 1 }],
      deliveryDetails: { customerName: "Naledi" },
    }),
  );

  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.deliveryDetails?.customerName, "Naledi");
});
