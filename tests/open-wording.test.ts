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

test("the homepage never says launching and lists registered stores with a WhatsApp order", async () => {
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
  assert.match(home, /Order on WhatsApp/);
});

test("Lethela's own owner and pilot stores stay off the public store list", async () => {
  const homeData = await source("src/lib/home-data.ts");
  assert.match(homeData, /\(test\|testing\|asdf\|qwerty\|sample\|example\|lethela\)/);
});
