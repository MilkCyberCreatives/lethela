import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

// Gauta, 13 Oct 2026: Lethela is open and operating, so fixed wording must not call it launching.
// Gauta, 20 Oct 2026: no "launching" wording anywhere, even before a store is listed.
test("fixed public wording says Lethela is open in Klipfontein View", async () => {
  const [authShell, home, faq] = await Promise.all([
    source("src/components/auth/AuthShell.tsx"),
    source("src/app/page.tsx"),
    source("src/app/faq/page.tsx"),
  ]);
  assert.match(authShell, /Now open in Klipfontein View, Midrand\./);
  assert.doesNotMatch(authShell, /Launching from/);
  assert.match(home, /Lethela is open in Klipfontein View, Midrand\./);
  assert.doesNotMatch(home, /launching from Klipfontein View/);
  assert.match(faq, /Lethela is open in Klipfontein View, Midrand\./);
  assert.doesNotMatch(faq, /pre-launch/);
});

test("the homepage never says launching and lists registered stores, with online ordering only", async () => {
  const [home, hero, readiness] = await Promise.all([
    source("src/app/page.tsx"),
    source("src/components/Hero.tsx"),
    source("src/lib/launch-readiness.ts"),
  ]);
  for (const text of [home, hero, readiness]) {
    assert.doesNotMatch(text, /launching shortly|notify me when ordering/i);
  }
  assert.match(home, /getJoiningStores/);
  assert.match(home, /Stores on Lethela/);
  assert.doesNotMatch(home, /Order on WhatsApp|buildStoreOrderWhatsAppLink|cash on delivery/i);
});

test("orders are online only: no cash or WhatsApp ordering at checkout or on store pages", async () => {
  const [checkout, store] = await Promise.all([
    source("src/app/checkout/page.tsx"),
    source("src/app/vendors/[slug]/page.tsx"),
  ]);
  for (const text of [checkout, store]) {
    assert.doesNotMatch(text, /Order via WhatsApp|Cash on delivery|buildWhatsAppOrderLink/);
  }
  assert.match(checkout, /paymentMethod: "OZOW"/);
});

test("Lethela's own owner and pilot stores stay off the public store list", async () => {
  const homeData = await source("src/lib/home-data.ts");
  assert.match(homeData, /\(test\|testing\|asdf\|qwerty\|sample\|example\|lethela\)/);
});
