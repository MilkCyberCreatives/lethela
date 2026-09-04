import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("generated app icons and branded social images are configured", async () => {
  const [favicon, appleIcon, openGraph, twitter, layout, manifest, brandImage] = await Promise.all([
    source("public/lethelaicon.svg"),
    source("src/app/apple-icon.tsx"),
    source("src/app/opengraph-image.tsx"),
    source("src/app/twitter-image.tsx"),
    source("src/app/layout.tsx"),
    source("src/app/manifest.ts"),
    source("src/lib/brand-image.tsx"),
  ]);

  assert.match(favicon, /#B5001B/);
  assert.match(appleIcon, /180/);
  assert.match(appleIcon, /BrandMark/);
  assert.match(openGraph, /createBrandSocialImage/);
  assert.match(twitter, /createBrandSocialImage/);
  assert.match(brandImage, /BrandMark/);
  assert.doesNotMatch(layout, /defaultSocialImage/);
  assert.doesNotMatch(layout, /url: "\/icon"/);
  assert.match(layout, /\/lethelaicon\.svg\?v=official-20260904/);
  assert.match(layout, /\/apple-icon/);
  assert.match(manifest, /\/lethelaicon\.svg\?v=official-20260904/);
});

test("the hero does not fetch hidden nearby-vendor content", async () => {
  const [hero, homePage] = await Promise.all([
    source("src/components/Hero.tsx"),
    source("src/app/page.tsx"),
  ]);
  assert.doesNotMatch(hero, /NearbyVendorResponse/);
  assert.doesNotMatch(hero, /fetch\(`\/api\/vendors/);
  assert.doesNotMatch(hero, /\{false \? \(/);
  assert.match(hero, /fetchPriority="high"/);
  assert.match(hero, /dynamic\(\(\) => import\("@\/components\/LocationPicker"\)/);
  assert.match(homePage, /export const revalidate = 180/);
  assert.doesNotMatch(homePage, /getDisplaySuburb|next\/headers|cookies\(/);
});

test("public catalogue code does not select private bank or KYC values", async () => {
  const [home, product, sitemap] = await Promise.all([
    source("src/lib/home-data.ts"),
    source("src/app/products/[id]/page.tsx"),
    source("src/app/sitemap.ts"),
  ]);

  for (const publicSource of [home, product, sitemap]) {
    assert.doesNotMatch(publicSource, /bankAccountNumber:\s*true/);
    assert.doesNotMatch(publicSource, /kycIdUrl:\s*true/);
    assert.doesNotMatch(publicSource, /kycProofUrl:\s*true/);
  }
});

test("public vendor profiles use an explicit public-field query", async () => {
  const queries = await source("src/server/queries.ts");
  assert.match(queries, /select:\s*\{/);
  assert.doesNotMatch(queries, /include:\s*\{\s*products/);
  assert.doesNotMatch(queries, /bankAccountNumber:\s*true/);
  assert.doesNotMatch(queries, /kycIdUrl:\s*true/);
});

test("marketing scripts are consent-gated and lazy loaded", async () => {
  const marketing = await source("src/components/MarketingScripts.tsx");
  assert.match(marketing, /canUseAnalyticsCookies/);
  assert.match(marketing, /strategy="lazyOnload"/);
  assert.doesNotMatch(marketing, /strategy="afterInteractive"/);
});

test("the sitemap is cached and omits private or utility routes", async () => {
  const sitemap = await source("src/app/sitemap.ts");
  assert.match(sitemap, /export const revalidate = 3600/);
  assert.doesNotMatch(sitemap, /force-dynamic/);
  assert.doesNotMatch(sitemap, /\/track`/);
  assert.doesNotMatch(sitemap, /\/llms\.txt`/);
  assert.doesNotMatch(sitemap, /\/feeds\/google-merchant\.xml`/);
});

test("image optimisation and session polling safeguards remain enabled", async () => {
  const [nextConfig, providers] = await Promise.all([
    source("next.config.mjs"),
    source("src/components/Providers.tsx"),
  ]);
  assert.match(nextConfig, /image\/avif/);
  // A substantial optimizer cache TTL (>= 1 day) must stay configured.
  assert.match(nextConfig, /minimumCacheTTL:\s*(?:86400|\d{6,})/);
  assert.match(providers, /refetchOnWindowFocus=\{false\}/);
  assert.match(providers, /refetchInterval=\{0\}/);
});

test("primary shopping and account surfaces preserve mobile-first ergonomics", async () => {
  const [home, product, menu, preferences, auth, footer, header] = await Promise.all([
    source("src/app/page.tsx"),
    source("src/components/HomeProductCard.tsx"),
    source("src/components/MenuSectionList.tsx"),
    source("src/components/MealPreferenceControls.tsx"),
    source("src/components/auth/AuthShell.tsx"),
    source("src/components/Footer.tsx"),
    source("src/components/MainHeader.tsx"),
  ]);

  assert.match(home, /snap-mandatory/);
  assert.match(home, /auto-cols-\[82%\]/);
  assert.match(product, /min-h-11/);
  assert.match(menu, /flex-col gap-3/);
  assert.match(menu, /min-h-11 w-full/);
  assert.match(preferences, /h-11 w-11/);
  assert.match(auth, /hidden overflow-hidden[\s\S]*lg:block/);
  assert.match(footer, /min-h-11/);
  assert.match(header, /src="\/lethelalogo\.svg"[\s\S]*preload/);
});
