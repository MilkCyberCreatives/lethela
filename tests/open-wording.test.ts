import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

// Gauta, 13 Oct 2026: Lethela is open and operating, so fixed wording must not call it launching.
// The homepage's "Launching shortly" line only shows while no store is listed.
test("fixed public wording says Lethela is open in Klipfontein View", async () => {
  const [authShell, home, faq] = await Promise.all([
    source("src/components/auth/AuthShell.tsx"),
    source("src/app/page.tsx"),
    source("src/app/faq/page.tsx"),
  ]);
  assert.match(authShell, /Now open in Klipfontein View, Midrand\./);
  assert.doesNotMatch(authShell, /Launching from/);
  assert.match(home, /marketplace for South Africa, now open in Klipfontein View/);
  assert.doesNotMatch(home, /launching from Klipfontein View/);
  assert.match(faq, /Lethela is open in Klipfontein View, Midrand\./);
  assert.doesNotMatch(faq, /pre-launch/);
});
