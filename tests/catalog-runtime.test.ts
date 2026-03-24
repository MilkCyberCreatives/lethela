import test from "node:test";
import assert from "node:assert/strict";
import { getCatalogMode, shouldPreferCatalogFallback } from "../src/lib/catalog-runtime";

function resetCatalogEnv() {
  delete process.env.DEMO_CATALOG_MODE;
  delete process.env.FORCE_CATALOG_FALLBACK;
  delete process.env.ALLOW_PRODUCTION_DEMO_CATALOG;
  delete process.env.VERCEL_ENV;
  delete process.env.NODE_ENV;
}

test("catalog runtime defaults to live mode", () => {
  resetCatalogEnv();

  assert.equal(getCatalogMode(), "live");
  assert.equal(shouldPreferCatalogFallback(), false);
});

test("catalog runtime honors explicit demo mode", () => {
  resetCatalogEnv();
  process.env.DEMO_CATALOG_MODE = "true";

  assert.equal(getCatalogMode(), "demo");
  assert.equal(shouldPreferCatalogFallback(), true);

  resetCatalogEnv();
});

test("catalog runtime keeps backward compatibility with legacy fallback flag", () => {
  resetCatalogEnv();
  process.env.FORCE_CATALOG_FALLBACK = "true";

  assert.equal(getCatalogMode(), "demo");
  assert.equal(shouldPreferCatalogFallback(), true);

  resetCatalogEnv();
});

test("catalog runtime rejects demo mode in production launches by default", () => {
  resetCatalogEnv();
  process.env.NODE_ENV = "production";
  process.env.DEMO_CATALOG_MODE = "true";

  assert.throws(() => getCatalogMode(), /Demo catalog mode is disabled for production launches/);

  resetCatalogEnv();
});

test("catalog runtime allows explicit production demo override", () => {
  resetCatalogEnv();
  process.env.NODE_ENV = "production";
  process.env.DEMO_CATALOG_MODE = "true";
  process.env.ALLOW_PRODUCTION_DEMO_CATALOG = "true";

  assert.equal(getCatalogMode(), "demo");
  assert.equal(shouldPreferCatalogFallback(), true);

  resetCatalogEnv();
});
