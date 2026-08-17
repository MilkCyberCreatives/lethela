import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("legacy order status lookup requires protected tracking access", () => {
  const route = source("src/app/api/orders/status/route.ts");
  assert.match(route, /verifyOrderTrackingToken/);
  assert.match(route, /session\.user\.id === order\.userId/);
  assert.match(route, /checkRateLimit/);
  assert.match(route, /private, no-store/);
});

test("vendor email recovery never overrides an assigned owner", () => {
  const authz = source("src/lib/authz.ts");
  assert.match(authz, /ownerId:\s*null,\s*email:/);
  assert.doesNotMatch(
    authz,
    /OR:\s*\[\s*\{ ownerId: session\.user\.id \},\s*\{ email: session\.user\.email\.toLowerCase\(\) \}/,
  );
});

test("rider email recovery only claims unlinked legacy applications", () => {
  for (const relativePath of [
    "src/app/api/riders/me/route.ts",
    "src/app/api/riders/profile/route.ts",
  ]) {
    const route = source(relativePath);
    assert.match(route, /userId:\s*null,\s*email:\s*sessionEmail/);
    assert.match(route, /session\.user\.email\?\.trim\(\)\.toLowerCase\(\)/);
  }
});

test("launch readiness uses the same private storage capability as upload runtime", () => {
  const route = source("src/app/api/ops/launch-readiness/route.ts");
  assert.match(route, /hasPrivateStorageConfig/);
  assert.match(route, /const privateStorageConfigured = hasPrivateStorageConfig\(\)/);
});

test("production and security checks accept the same Supabase aliases as runtime", () => {
  const productionCheck = source("scripts/check-production-env.mjs");
  const securityCheck = source("scripts/check-security-env.mjs");

  for (const check of [productionCheck, securityCheck]) {
    assert.match(check, /NEXT_PUBLIC_SUPABASE_URL/);
    assert.match(check, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(check, /SUPABASE_STORAGE_BUCKET/);
    assert.match(check, /SUPABASE_PRIVATE_STORAGE_BUCKET/);
  }
});
