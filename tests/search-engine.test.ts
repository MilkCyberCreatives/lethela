import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

// The rider and vendor sign-up pages are where Lethela's posts and flyers send people, so
// search engines and AI assistants must be allowed to list them.
test("rider and vendor sign-up pages can be indexed and are in the sitemap", async () => {
  const [rider, vendor, sitemap] = await Promise.all([
    source("src/app/rider/page.tsx"),
    source("src/app/vendors/register/page.tsx"),
    source("src/app/sitemap.ts"),
  ]);
  assert.doesNotMatch(rider, /index: false/);
  assert.doesNotMatch(vendor, /index: false/);
  assert.match(sitemap, /url: `\$\{SITE_URL\}\/rider`/);
  assert.match(sitemap, /url: `\$\{SITE_URL\}\/vendors\/register`/);
});

// Lethela delivers in one area today, so structured data must not claim the whole country.
test("structured data names Klipfontein View as the service area", async () => {
  const layout = await source("src/app/layout.tsx");
  assert.match(layout, /name: "Klipfontein View, Midrand"/);
  assert.doesNotMatch(layout, /"@type": "Country"/);
});

// Google only allows FAQ structured data for questions that are visible on the page.
test("the homepage does not publish hidden FAQ structured data", async () => {
  const home = await source("src/app/page.tsx");
  assert.doesNotMatch(home, /"FAQPage"/);
});

// Lethela's fee structure is for signed-in users only, so the AI summaries must not quote it.
test("AI summaries carry no fee figures", async () => {
  const [llms, ai] = await Promise.all([
    source("src/app/llms.txt/route.ts"),
    source("src/app/ai.txt/route.ts"),
  ]);
  for (const text of [llms, ai]) {
    assert.doesNotMatch(text, /R\s?\d|\d+\s?%|per km|\/km/i);
  }
});

// The rider and vendor sign-up FAQs are public, so they must not quote Lethela's fees.
test("sign-up FAQs carry no fee figures", async () => {
  const faq = await source("src/components/auth/SignupFaq.tsx");
  assert.match(faq, /"FAQPage"/);
  assert.doesNotMatch(faq, /R\s?\d|\d+\s?%|per km|\/km/i);
});
