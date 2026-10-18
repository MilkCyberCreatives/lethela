import assert from "node:assert/strict";
import test from "node:test";
import {
  cashOnDeliverySettings,
  isCashOnDelivery,
  isConfirmedPayment,
  isOnlinePaid,
} from "../src/lib/payment-status";
import {
  buildCustomerCancellationMessage,
  buildRiderAssignmentMessage,
  buildRiderOfferMessage,
  buildVendorOrderWhatsAppMessage,
} from "../src/lib/order-notifications";

test("cash orders go ahead like paid orders but are not online payments", () => {
  assert.equal(isConfirmedPayment("CASH"), true);
  assert.equal(isConfirmedPayment("PAID"), true);
  assert.equal(isConfirmedPayment("SUCCESS"), true);
  assert.equal(isConfirmedPayment("PENDING"), false);
  assert.equal(isConfirmedPayment("FAILED"), false);
  assert.equal(isCashOnDelivery("cash"), true);
  assert.equal(isOnlinePaid("CASH"), false);
  assert.equal(isOnlinePaid("PAID"), true);
});

test("cash on delivery is on by default with a R600 limit, and can be turned off", () => {
  const before = { ...process.env };
  try {
    delete process.env.CASH_ON_DELIVERY_ENABLED;
    delete process.env.CASH_ON_DELIVERY_MAX_CENTS;
    assert.deepEqual(cashOnDeliverySettings(), { enabled: true, maxCents: 60_000 });
    process.env.CASH_ON_DELIVERY_ENABLED = "false";
    process.env.CASH_ON_DELIVERY_MAX_CENTS = "40000";
    assert.deepEqual(cashOnDeliverySettings(), { enabled: false, maxCents: 40_000 });
  } finally {
    process.env = before;
  }
});

test("store, rider and customer messages say when it is cash on delivery", () => {
  const vendor = buildVendorOrderWhatsAppMessage({
    orderRef: "LET-1",
    vendorName: "Mama's Kota",
    totalCents: 8500,
    deliveryFeeCents: 1000,
    items: [{ name: "Kota", qty: 1 }],
    deliveryDetails: null,
    dashboardUrl: "https://example.test/vendors/dashboard",
    cashOnDelivery: true,
  });
  assert.match(vendor, /cash on delivery/);
  assert.doesNotMatch(vendor, /Total paid/);

  const dropoff = { address: "12 Main Rd", landmark: "", containsAlcohol: false } as Parameters<
    typeof buildRiderAssignmentMessage
  >[0]["dropoff"];
  const rider = buildRiderAssignmentMessage({
    orderRef: "LET-1",
    vendorName: "Mama's Kota",
    pickupAddress: "1 Store St",
    dropoff,
    earnCents: 1000,
    dashboardUrl: "https://example.test/rider/dashboard",
    collectCashCents: 8500,
  });
  assert.match(rider, /collect R85\.00 from the customer/);

  const offer = buildRiderOfferMessage({
    orderRef: "LET-1",
    vendorName: "Mama's Kota",
    pickupAddress: "1 Store St",
    dropoffArea: "Klipfontein View",
    distanceKm: 1.2,
    earnCents: 1000,
    dashboardUrl: "https://example.test/rider/dashboard",
    collectCashCents: 8500,
  });
  assert.match(offer, /Cash on delivery: collect R85\.00/);

  const cancelled = buildCustomerCancellationMessage({
    orderRef: "LET-1",
    vendorName: "Mama's Kota",
    reason: "",
    paid: isOnlinePaid("CASH"),
    totalCents: 8500,
    orderUrl: "https://example.test/orders/LET-1",
  });
  assert.doesNotMatch(cancelled, /refund/);
});
