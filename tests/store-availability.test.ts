import test from "node:test";
import assert from "node:assert/strict";
import { isStoreOpenNow } from "../src/lib/store-availability";

test("store availability uses Africa/Johannesburg hours and temporary closure", () => {
  const monday = [{ day: 1, openMin: 9 * 60, closeMin: 17 * 60, closed: false }];
  const tenAmJohannesburg = new Date("2026-07-20T08:00:00.000Z");
  const sixPmJohannesburg = new Date("2026-07-20T16:00:00.000Z");
  assert.equal(isStoreOpenNow(monday, { now: tenAmJohannesburg }), true);
  assert.equal(isStoreOpenNow(monday, { now: sixPmJohannesburg }), false);
  assert.equal(isStoreOpenNow(monday, { now: tenAmJohannesburg, temporaryClosed: true }), false);
});

test("store availability handles the UTC/Johannesburg day boundary", () => {
  const tuesdayOnly = [{ day: 2, openMin: 0, closeMin: 2 * 60, closed: false }];
  // 23:30 UTC on Monday is 01:30 on Tuesday in Johannesburg.
  const lateMondayUtc = new Date("2026-07-20T23:30:00.000Z");
  assert.equal(isStoreOpenNow(tuesdayOnly, { now: lateMondayUtc }), true);
});
