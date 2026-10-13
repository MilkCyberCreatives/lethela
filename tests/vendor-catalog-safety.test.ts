import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { z } from "zod";
import { catalogInputErrorMessage } from "../src/lib/catalog-input";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("menu and product form problems read as plain instructions", () => {
  const schema = z.object({
    name: z.string().min(2),
    priceCents: z.number().int().min(100),
  });
  const result = schema.safeParse({ name: "A", priceCents: 50 });
  assert.equal(result.success, false);
  if (result.success) return;
  const message = catalogInputErrorMessage(result.error);
  assert.match(message, /name needs at least 2 letters/);
  assert.match(message, /price must be between R1 and R20 000/);
  assert.doesNotMatch(message, /payload/i);
});

test("saving an unchanged product keeps it approved", async () => {
  const route = await source("src/app/api/vendor/products/[id]/route.ts");
  // Re-review is triggered by real changes only, compared with the saved product.
  assert.match(route, /const changed = </);
  assert.match(route, /changed\("priceCents", data\.priceCents\)/);
  assert.doesNotMatch(route, /data\.priceCents !== undefined \|\|/);
  // A lapsed licence must not stop a vendor from marking a liquor item out of stock.
  assert.match(route, /data\.isAlcohol && !ownedProduct\.isAlcohol/);
});

test("liquor menu items need a current licence before customers can see them", async () => {
  const [create, update, queries, menuList, menuManager] = await Promise.all([
    source("src/app/api/vendors/menu/items/route.ts"),
    source("src/app/api/vendors/menu/items/[id]/route.ts"),
    source("src/server/queries.ts"),
    source("src/components/MenuSectionList.tsx"),
    source("src/components/dashboard/MenuManager.tsx"),
  ]);
  for (const route of [create, update]) {
    assert.match(route, /parsed\.data\.isAlcohol && !parsed\.data\.draft/);
    assert.match(route, /hasCurrentLiquorLicence\(vendorId\)/);
  }
  assert.match(queries, /\.filter\(\(item\) => liquorLicensed \|\| !item\.isAlcohol\)/);
  // The cart learns an item is liquor from the item itself, so checkout asks for 18+.
  assert.match(menuList, /Boolean\(it\.isAlcohol\)/);
  // Publishing or hiding an item keeps its liquor flag.
  assert.match(menuManager, /isAlcohol: item\.isAlcohol,\s*draft: !item\.draft/);
});

test("product prices keep their cents and imports keep the vendor's price", async () => {
  const [products, bulk] = await Promise.all([
    source("src/components/dashboard/ProductsManager.tsx"),
    source("src/components/dashboard/BulkImportProducts.tsx"),
  ]);
  assert.doesNotMatch(products, /Math\.round\(form\.priceCents \/ 100\)/);
  assert.match(products, /price: \(product\.priceCents \/ 100\)\.toFixed\(2\)/);
  // The import box starts empty (example rows are only a placeholder).
  assert.match(bulk, /useState\(headerRow\)/);
  assert.match(bulk, /placeholder=\{exampleCsv\}/);
  // A suggested price is only used when the row has no price of its own.
  assert.match(bulk, /if \(priceCents < 100\) \{\s*const priceResponse/);
});

test("broadcasts and the go-live checklist include approved stores", async () => {
  const [messages, checklist] = await Promise.all([
    source("src/lib/platform-messages.ts"),
    source("src/app/admin/launch-checklist/page.tsx"),
  ]);
  assert.doesNotMatch(messages, /where: \{ status: "ACTIVE", isActive: true \}/);
  assert.match(messages, /status: \{ in: \["ACTIVE", "APPROVED"\] \}, isActive: true/);
  assert.match(checklist, /status: \{ in: \["ACTIVE", "APPROVED"\] \}/);
});

test("admin can approve a trusted store's waiting items in one go", async () => {
  const [admin, products] = await Promise.all([
    source("src/app/admin/page.tsx"),
    source("src/app/api/admin/products/route.ts"),
  ]);
  assert.match(admin, /async function approveStoreProducts/);
  assert.match(admin, /Approve all \$\{waitingIds\.length\}/);
  assert.match(products, /groupBy\(\{ by: \["status"\]/);
  // Only statuses the operations API accepts are offered in the status picker.
  const operations = await source("src/app/api/admin/operations/route.ts");
  const listAfter = (text: string, marker: string) => {
    const start = text.indexOf(marker);
    assert.notEqual(start, -1, marker);
    const block = text.slice(start, text.indexOf("] as const", start));
    return [...block.matchAll(/"([A-Z_]+)"/g)].map((match) => match[1]);
  };
  assert.deepEqual(
    listAfter(admin, "const ADMIN_ORDER_STATUSES = ["),
    listAfter(operations, "const ADMIN_OPERATIONAL_STATUSES = ["),
  );
  assert.match(admin, /ADMIN_ORDER_STATUSES\.map/);
});

test("the homepage lists an approved store with only menu items, whatever capitals its area has", async () => {
  const [home, sqlite, page] = await Promise.all([
    source("src/lib/home-data.ts"),
    source("src/lib/sqlite-catalog.ts"),
    source("src/app/page.tsx"),
  ]);
  const homeVendors = home.slice(home.indexOf("export async function getHomeVendors"));
  // Same rule as the store page: an approved product or a published menu item is enough.
  assert.match(
    homeVendors,
    /OR: \[\s*\{ products: \{ some: \{[^}]*status: "APPROVED" \} \} \},\s*\{ items: \{ some: \{ draft: false, isAlcohol: false \} \} \},\s*\]/,
  );
  assert.match(
    sqlite,
    /OR EXISTS \(SELECT 1 FROM Item vi WHERE vi\.vendorId = v\.id AND vi\.draft = 0 AND vi\.isAlcohol = 0\)/,
  );
  assert.match(page, /const hasMarketplaceItems = vendors\.length > 0;/);
  // Postgres compares capitals, so "Klipfontein view" typed on a phone must still match.
  assert.match(
    home,
    /provider === "postgresql"\s*\?\s*\(\{ contains: area, mode: "insensitive" \}/,
  );
  assert.doesNotMatch(home, /suburb: \{ contains: normalizedSuburb \}/);
});

test("homepage store cards say Closed outside trading hours", async () => {
  const { buildPublicVendorCard } = await import("../src/lib/public-catalog");
  const base = { id: "v1", name: "Kasi Kitchen", slug: "kasi-kitchen", products: [] };
  const everyDay = (hour: { openMin: number; closeMin: number; closed: boolean }) =>
    Array.from({ length: 7 }, (_, day) => ({ day, ...hour }));

  const closedAllWeek = everyDay({ openMin: 480, closeMin: 1200, closed: true });
  const openAllDay = everyDay({ openMin: 0, closeMin: 1440, closed: false });
  assert.equal(buildPublicVendorCard({ ...base, hours: closedAllWeek }).isOpen, false);
  assert.equal(buildPublicVendorCard({ ...base, hours: openAllDay }).isOpen, true);
  assert.equal(
    buildPublicVendorCard({ ...base, hours: openAllDay, temporaryClosed: true }).isOpen,
    false,
  );
  // Callers that pass no trading hours keep the old label.
  assert.equal(buildPublicVendorCard(base).isOpen, true);

  const [home, sqlite, card] = await Promise.all([
    source("src/lib/home-data.ts"),
    source("src/lib/sqlite-catalog.ts"),
    source("src/components/VendorCard.tsx"),
  ]);
  const homeVendors = home.slice(home.indexOf("export async function getHomeVendors"));
  assert.match(
    homeVendors,
    /hours: \{ select: \{ day: true, openMin: true, closeMin: true, closed: true \} \}/,
  );
  assert.match(homeVendors, /hours: vendor\.hours,\s*temporaryClosed: vendor\.temporaryClosed,/);
  assert.match(sqlite, /json_group_array\(json_object\('day', h\.day/);
  assert.match(sqlite, /hours: parseHours\(row\.hoursJson\)/);
  // The homepage is cached, so the card checks the hours again in the browser.
  assert.match(card, /useSyncExternalStore\(/);
  assert.match(card, /isStoreOpenNow\(v\.hours, \{ temporaryClosed: v\.temporaryClosed \}\)/);
  assert.match(card, /\{isOpen \? "Open" : "Closed"\}/);
});
