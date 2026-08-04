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

test("empty marketplace remains in pre-launch mode", () => {
  process.env.NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE = "public";
  const status = getMarketplaceLaunchStatus({ approvedVendorCount: 0, publicProductCount: 0 });
  assert.equal(status.phase, "PRE_LAUNCH");
  assert.match(status.eyebrow, /Launching shortly/i);
});

test("small live catalogue is labelled as pilot", () => {
  process.env.NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE = "pilot";
  const status = getMarketplaceLaunchStatus({ approvedVendorCount: 1, publicProductCount: 5 });
  assert.equal(status.phase, "PILOT");
  assert.match(status.eyebrow, /Pilot now open/i);
});

test("public label requires explicit mode and minimum catalogue", () => {
  process.env.NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE = "public";
  const status = getMarketplaceLaunchStatus({ approvedVendorCount: 3, publicProductCount: 20 });
  assert.equal(status.phase, "PUBLIC");
  assert.match(status.eyebrow, /Now delivering/i);
});
