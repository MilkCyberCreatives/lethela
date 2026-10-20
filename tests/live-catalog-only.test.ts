import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

// Order journey test, 20 Oct 2026: the live site showed built-in demo stores and products that
// do not exist, and search listed unapproved or sold-out products and missed menu-only stores.
test("store and product pages never fall back to demo data on the live site", async () => {
  const [queries, product] = await Promise.all([
    source("src/server/queries.ts"),
    source("src/app/products/[id]/page.tsx"),
  ]);
  assert.match(queries, /if \(!vendor\) return allowFallback \? fallback : null;/);
  assert.doesNotMatch(
    product,
    /return isPublicMarketplaceProduct\(publicProduct\) \? product : fallback;/,
  );
  assert.match(
    product,
    /if \(!product\) return shouldUseCatalogFallbackBeforeQuery\(\) \? fallback : null;/,
  );
});

test("search shows only approved, in-stock products and finds menu-only stores", async () => {
  const search = await source("src/lib/search.ts");
  assert.equal(search.match(/AND p\.status = 'APPROVED'\s+AND p\."inStock" = true/g)?.length, 2);
  assert.equal(
    search.match(/FROM "Item" vi WHERE vi\."vendorId" = v\.id AND vi\.draft = false/g)?.length,
    2,
  );
  assert.match(search, /!shouldFallbackWhenCatalogEmpty\(\)\) return loose;/);
});

test("checkout accepts an order without a store slug", async () => {
  const route = await source("src/app/api/payments/ozow/create/route.ts");
  assert.match(
    route,
    /vendorSlug: z\.string\(\)\.trim\(\)\.max\(140\)\.optional\(\)\.default\(""\)/,
  );
});
