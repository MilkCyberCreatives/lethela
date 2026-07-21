import test from "node:test";
import assert from "node:assert/strict";
import { calculateOrderFinancials } from "../src/lib/order-financials";

test("order financials reconcile customer charge and recipient payouts", () => {
  const result = calculateOrderFinancials({
    subtotalCents: 10_000,
    deliveryFeeCents: 2_500,
    riderTipCents: 700,
    platformCommissionBps: 1_500,
  });
  assert.deepEqual(result, {
    subtotalCents: 10_000,
    deliveryFeeCents: 2_500,
    riderTipCents: 700,
    platformFeeCents: 1_500,
    vendorPayoutCents: 8_500,
    riderPayoutCents: 3_200,
    totalCents: 13_200,
  });
  assert.equal(result.vendorPayoutCents + result.platformFeeCents, result.subtotalCents);
});

test("financials clamp negative values and excessive commission", () => {
  const result = calculateOrderFinancials({
    subtotalCents: 501,
    deliveryFeeCents: -10,
    riderTipCents: -50,
    platformCommissionBps: 50_000,
  });
  assert.equal(result.platformFeeCents, 501);
  assert.equal(result.vendorPayoutCents, 0);
  assert.equal(result.riderPayoutCents, 0);
  assert.equal(result.totalCents, 501);
});
