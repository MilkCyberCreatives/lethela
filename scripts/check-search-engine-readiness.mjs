import fs from "node:fs";
import path from "node:path";

const sourceOnly = process.argv.includes("--source-only");
const root = process.cwd();
const errors = [];
const warnings = [];

function file(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`${relativePath}: required search-engine file is missing.`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

const layout = file("src/app/layout.tsx");
const robots = file("src/app/robots.ts");
const sitemap = file("src/app/sitemap.ts");
const discoverySitemap = file("src/app/discovery-sitemap.xml/route.ts");
const manifest = file("src/app/manifest.ts");
const openSearch = file("src/app/opensearch.xml/route.ts");
const llms = file("src/app/llms.txt/route.ts");
const areaPage = file("src/app/areas/klipfontein-view/page.tsx");

const requiredChecks = [
  [layout.includes("NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION"), "Google site verification hook is missing."],
  [layout.includes("NEXT_PUBLIC_BING_SITE_VERIFICATION"), "Bing site verification hook is missing."],
  [!layout.includes('alternates: {\n    canonical: "/"'), "Root canonical must not leak onto child routes."],
  [robots.includes("sitemap"), "robots.ts must publish sitemap URLs."],
  [robots.includes("/admin"), "robots.ts must block private admin routes."],
  [sitemap.includes("TOWNSHIP_CATEGORIES"), "The dynamic marketplace sitemap is incomplete."],
  [discoverySitemap.includes("/areas/klipfontein-view"), "The first operating-area page is missing from discovery."],
  [manifest.includes("standalone"), "The web app manifest is incomplete."],
  [openSearch.includes("OpenSearchDescription"), "OpenSearch discovery is missing."],
  [llms.includes("Public discovery"), "The public AI discovery summary is incomplete."],
  [areaPage.includes("BreadcrumbList"), "Area-page structured data is incomplete."],
];

for (const [ok, message] of requiredChecks) {
  if (!ok) errors.push(message);
}

if (!sourceOnly) {
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (siteUrl !== "https://www.lethela.co.za") {
    warnings.push("NEXT_PUBLIC_SITE_URL should be the canonical https://www.lethela.co.za domain.");
  }
  if (!process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION) {
    warnings.push("Google Search Console verification token is not configured.");
  }
  if (!process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION) {
    warnings.push("Bing Webmaster Tools verification token is not configured.");
  }
  if (!process.env.NEXT_PUBLIC_GA4_ID && !process.env.NEXT_PUBLIC_GTM_ID) {
    warnings.push("GA4 or Google Tag Manager is not configured for search-performance measurement.");
  }
}

console.log("Search-engine readiness check");
for (const warning of warnings) console.log(`Warning: ${warning}`);
for (const error of errors) console.error(`Error: ${error}`);

if (errors.length > 0) {
  process.exitCode = 1;
} else {
  console.log(`Result: PASS${warnings.length ? ` with ${warnings.length} warning(s)` : ""}.`);
}
