import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionOrderStatus, normalizeOrderStatus } from "../src/lib/order-state";

test("order state machine allows only valid fulfilment progress", () => {
  assert.equal(canTransitionOrderStatus("PAID", "NEW"), true);
  assert.equal(canTransitionOrderStatus("PREPARING", "READY_FOR_PICKUP"), true);
  assert.equal(canTransitionOrderStatus("RIDER_ASSIGNED", "READY_FOR_PICKUP"), true);
  assert.equal(canTransitionOrderStatus("ON_THE_WAY", "DELIVERED"), true);
  assert.equal(canTransitionOrderStatus("NEW", "DELIVERED"), false);
  assert.equal(canTransitionOrderStatus("REFUNDED", "NEW"), false);
});

test("legacy persisted statuses normalize to canonical values", () => {
  assert.equal(normalizeOrderStatus("PLACED"), "NEW");
  assert.equal(normalizeOrderStatus("OUT_FOR_DELIVERY"), "ON_THE_WAY");
  assert.equal(normalizeOrderStatus("CANCELED"), "CANCELLED");
});
