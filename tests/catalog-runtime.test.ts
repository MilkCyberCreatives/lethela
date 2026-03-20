import test from "node:test";
import assert from "node:assert/strict";
import { getCatalogMode, shouldPreferCatalogFallback } from "../src/lib/catalog-runtime";

test("catalog runtime defaults to live mode", () => {
  delete process.env.DEMO_CATALOG_MODE;
  delete process.env.FORCE_CATALOG_FALLBACK;

  assert.equal(getCatalogMode(), "live");
  assert.equal(shouldPreferCatalogFallback(), false);
});

test("catalog runtime honors explicit demo mode", () => {
  process.env.DEMO_CATALOG_MODE = "true";
  delete process.env.FORCE_CATALOG_FALLBACK;

  assert.equal(getCatalogMode(), "demo");
  assert.equal(shouldPreferCatalogFallback(), true);

  delete process.env.DEMO_CATALOG_MODE;
});

test("catalog runtime keeps backward compatibility with legacy fallback flag", () => {
  delete process.env.DEMO_CATALOG_MODE;
  process.env.FORCE_CATALOG_FALLBACK = "true";

  assert.equal(getCatalogMode(), "demo");
  assert.equal(shouldPreferCatalogFallback(), true);

  delete process.env.FORCE_CATALOG_FALLBACK;
});
