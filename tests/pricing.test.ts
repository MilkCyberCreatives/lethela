import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PUBLIC_DELIVERY_WORDING, deliveryFeeCents } from "../src/lib/pricing";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

// Lethela fee figures: rand amounts (R10, R 150), percentages and per-km rates.
const FEE_FIGURE = /\bR\s?[1-9]|\d\s?%|\b[Pp]er (?:road )?(?:km|kilomet)|\/km\b/;

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

test("public delivery wording explains the fee without any figures", () => {
  assert.doesNotMatch(PUBLIC_DELIVERY_WORDING, /\d/);
  assert.match(PUBLIC_DELIVERY_WORDING, /road distance/);
  assert.match(PUBLIC_DELIVERY_WORDING, /before you pay/);
});

test("the pricing page is for signed-in users only and stays out of search discovery", async () => {
  const [page, discoverySitemap, sitemap, robots] = await Promise.all([
    source("src/app/pricing/page.tsx"),
    source("src/app/discovery-sitemap.xml/route.ts"),
    source("src/app/sitemap.ts"),
    source("src/app/robots.ts"),
  ]);

  assert.match(page, /await auth\(\)/);
  assert.match(page, /if \(!session\?\.user\?\.id\)/);
  assert.match(page, /redirect\("\/signin\?callbackUrl=\/pricing"\)/);
  assert.match(page, /buildNoIndexMetadata\(\{/);
  assert.doesNotMatch(discoverySitemap, /\/pricing/);
  assert.doesNotMatch(sitemap, /\/pricing/);
  // Search engines must still be able to fetch /pricing and see the sign-in redirect,
  // so the page drops out of results that were indexed while it was public.
  assert.doesNotMatch(robots, /"\/pricing"/);
});

test("pages anyone can open do not show Lethela fee figures", async () => {
  const publicSources = [
    "src/app/faq/page.tsx",
    "src/app/areas/klipfontein-view/page.tsx",
    "src/app/how-it-works/page.tsx",
    "src/app/vendors/[slug]/page.tsx",
    "src/app/checkout/page.tsx",
    "src/components/CartDrawer.tsx",
    "src/components/VendorCard.tsx",
    "src/app/llms.txt/route.ts",
    "src/app/ai.txt/route.ts",
    "src/lib/business-context.ts",
  ];

  for (const path of publicSources) {
    const text = await source(path);
    assert.doesNotMatch(text, /DELIVERY_PRICING_WORDING|DELIVERY_FEE_TIERS/, path);
    assert.doesNotMatch(text, FEE_FIGURE, path);
  }
});
