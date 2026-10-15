// Runs Google Lighthouse (the engine behind PageSpeed Insights) on Lethela's public pages and
// prints the four category scores for phones and desktops.
//
// Usage: node scripts/lighthouse-scores.mjs [base-url] [output-dir]
// Defaults to the live site. Needs Chrome or Chromium (set CHROME_PATH if it is not found).
// Only signed-out public pages are listed here; never add API, order or dashboard routes.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const baseUrl = (process.argv[2] || "https://www.lethela.co.za").replace(/\/+$/, "");
const outputDir = path.resolve(process.argv[3] || "lighthouse-reports");
const lighthouseVersion = "12.8.2";

const pages = [
  "/",
  "/areas/klipfontein-view",
  "/how-it-works",
  "/faq",
  "/about",
  "/categories",
  "/restaurants",
  "/search",
  "/contact",
  "/rider",
  "/vendors/register",
];

const categories = ["performance", "accessibility", "best-practices", "seo"];
const labels = ["Speed", "Accessibility", "Best practices", "SEO"];

fs.mkdirSync(outputDir, { recursive: true });

function runLighthouse(url, mode, outputPath) {
  const args = [
    "--yes",
    `lighthouse@${lighthouseVersion}`,
    url,
    "--quiet",
    "--output=json",
    `--output-path=${outputPath}`,
    "--chrome-flags=--headless=new --no-sandbox",
    ...(mode === "desktop" ? ["--preset=desktop"] : []),
  ];
  // Lighthouse occasionally fails to start a page; one retry keeps a flaky run from
  // leaving a gap in the table.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      execFileSync("npx", args, { stdio: ["ignore", "ignore", "pipe"] });
      const report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
      if (!report.runtimeError) return report;
    } catch {
      // Retry below.
    }
  }
  return null;
}

// For any score below 100, print what held it back so a fix can be planned from the log.
function printDiagnostics(report) {
  const lines = [];
  for (const category of Object.values(report.categories)) {
    if (category.score === 1) continue;
    for (const ref of category.auditRefs) {
      if (!ref.weight) continue;
      const audit = report.audits[ref.id];
      if (audit && audit.score !== null && audit.score < 1) {
        lines.push(`${audit.id} ${audit.displayValue || audit.score}`);
      }
    }
  }
  if (report.categories.performance?.score < 0.95) {
    const metrics = report.audits.metrics?.details?.items?.[0] || {};
    lines.push(
      `metrics FCP ${metrics.firstContentfulPaint} LCP ${metrics.largestContentfulPaint} TBT ${metrics.totalBlockingTime} TTFB ${metrics.timeToFirstByte} observed LCP ${metrics.observedLargestContentfulPaint}`,
    );
    const lcp = report.audits["largest-contentful-paint-element"]?.details?.items || [];
    const node = lcp[0]?.items?.[0]?.node;
    if (node) lines.push(`LCP element ${String(node.snippet).slice(0, 300)}`);
    const phases = lcp[1]?.items?.map((item) => `${item.phase} ${Math.round(item.timing)}`);
    if (phases) lines.push(`LCP phases ${phases.join(", ")}`);
    for (const id of ["bootup-time", "network-requests"]) {
      const items = report.audits[id]?.details?.items || [];
      const sorted =
        id === "network-requests"
          ? [...items].sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0))
          : items;
      for (const item of sorted.slice(0, 8)) {
        lines.push(
          `${id} ${item.url} ${id === "bootup-time" ? `${Math.round(item.total)}ms` : `${item.transferSize}B ${Math.round(item.networkEndTime - item.networkRequestTime)}ms ${item.resourceType}`}`,
        );
      }
    }
  }
  for (const line of lines) console.log(`    ${line}`);
}

const rows = [];
for (const pagePath of pages) {
  for (const mode of ["mobile", "desktop"]) {
    const name = `${pagePath.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}-${mode}`;
    const report = runLighthouse(
      `${baseUrl}${pagePath}`,
      mode,
      path.join(outputDir, `${name}.json`),
    );
    const scores = categories.map((id) => {
      const score = report?.categories?.[id]?.score;
      return typeof score === "number" ? Math.round(score * 100) : null;
    });
    rows.push({ pagePath, mode, scores });
    console.log(
      `${pagePath} (${mode}): ${scores.map((score, index) => `${labels[index]} ${score ?? "failed"}`).join(", ")}`,
    );
    if (report) printDiagnostics(report);
  }
}

const table = [
  `## Lighthouse scores for ${baseUrl}`,
  "",
  `| Page | Device | ${labels.join(" | ")} |`,
  `| --- | --- | ${labels.map(() => "---").join(" | ")} |`,
  ...rows.map(
    (row) =>
      `| ${row.pagePath} | ${row.mode} | ${row.scores.map((score) => score ?? "failed").join(" | ")} |`,
  ),
  "",
  "Scores move a few points between runs, mostly for speed on phones.",
].join("\n");

fs.writeFileSync(path.join(outputDir, "summary.md"), `${table}\n`);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`);
}
