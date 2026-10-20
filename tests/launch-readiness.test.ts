import test from "node:test";
import assert from "node:assert/strict";
import { getMarketplaceLaunchStatus } from "@/lib/launch-readiness";

const previousMode = process.env.NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE;

test.afterEach(() => {
  if (previousMode === undefined) {
    delete process.env.NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE;
  } else {
    process.env.NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE = previousMode;
  }
});

// Gauta, 20 Oct 2026: remove "launching soon". Lethela takes orders even before a store is listed.
test("empty marketplace still says Lethela is open", () => {
  process.env.NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE = "public";
  const status = getMarketplaceLaunchStatus({ approvedVendorCount: 0, publicProductCount: 0 });
  assert.equal(status.phase, "PRE_LAUNCH");
  assert.match(status.eyebrow, /Now open in Klipfontein View/i);
  assert.doesNotMatch(status.eyebrow, /launching/i);
});

test("small live catalogue is labelled as pilot", () => {
  process.env.NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE = "pilot";
  const status = getMarketplaceLaunchStatus({ approvedVendorCount: 1, publicProductCount: 5 });
  assert.equal(status.phase, "PILOT");
  assert.match(status.eyebrow, /Pilot now open/i);
});

test("a first store whose items are all on its menu opens the pilot", () => {
  process.env.NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE = "pilot";
  // Menu items are not products, but a listed store always has something to order.
  const status = getMarketplaceLaunchStatus({ approvedVendorCount: 1, publicProductCount: 0 });
  assert.equal(status.phase, "PILOT");
  assert.match(status.eyebrow, /Pilot now open/i);
});

test("public label requires explicit mode and minimum catalogue", () => {
  process.env.NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE = "public";
  const status = getMarketplaceLaunchStatus({ approvedVendorCount: 3, publicProductCount: 20 });
  assert.equal(status.phase, "PUBLIC");
  assert.match(status.eyebrow, /Now delivering/i);
});
