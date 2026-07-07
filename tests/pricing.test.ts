import test from "node:test";
import assert from "node:assert/strict";
import { deliveryFeeCents } from "../src/lib/pricing";

test("deliveryFeeCents charges R10 minimum and R10 per kilometre without rounding down", () => {
  const examples: Array<[number, number]> = [
    [0.2, 1000],
    [0.5, 1000],
    [0.9, 1000],
    [1.0, 1000],
    [1.1, 1100],
    [1.5, 1500],
    [2.0, 2000],
    [2.7, 2700],
    [3.4, 3400],
    [5.0, 5000],
  ];

  for (const [distanceKm, expectedCents] of examples) {
    assert.equal(deliveryFeeCents(distanceKm), expectedCents, `${distanceKm} km`);
  }
});
