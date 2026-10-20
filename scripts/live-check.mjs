// Checks that the live Lethela site answers on both domains, serves the expected commit
// and shows its public pages. It only sends GET requests to public, signed-out pages, so it
// never places orders, sends messages or changes data.
//
// Usage: node scripts/live-check.mjs [expectedCommitSha]
import { appendFileSync } from "node:fs";

const expectedCommit = (process.argv[2] || "").trim();
const primary = "https://www.lethela.co.za";
const apex = "https://lethela.co.za";
const waitForCommitMs = Number(process.env.LIVE_CHECK_WAIT_MS || 0);

const pages = [
  { path: "/", contains: ["Now open"] },
  { path: "/areas/klipfontein-view" },
  { path: "/how-it-works" },
  { path: "/faq" },
  { path: "/about" },
  { path: "/contact" },
  { path: "/search" },
  { path: "/categories" },
  { path: "/track" },
  { path: "/signin" },
  { path: "/signup" },
  { path: "/forgot-password" },
  { path: "/vendors/register" },
  { path: "/vendors/signin" },
  { path: "/rider" },
  { path: "/robots.txt" },
  { path: "/sitemap.xml", contains: ["<urlset"] },
  { path: "/manifest.webmanifest" },
  // A built-in demo store must never open on the live site: it does not exist.
  { path: "/vendors/kasie-market", status: 404 },
];

const lines = [];
let failed = false;

function log(ok, text) {
  if (!ok) failed = true;
  const line = `${ok ? "OK  " : "FAIL"} ${text}`;
  lines.push(line);
  console.log(line);
}

async function get(url, init = {}) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      redirect: init.redirect || "follow",
      headers: { "user-agent": "LethelaLiveCheck/1.0", "cache-control": "no-cache" },
      signal: AbortSignal.timeout(30_000),
    });
    const body = init.redirect === "manual" ? "" : await response.text();
    return { response, body, ms: Date.now() - started };
  } catch (error) {
    return { error, ms: Date.now() - started };
  }
}

async function liveCommit() {
  const { response, body } = await get(`${primary}/api/ops/version?check=${Date.now()}`);
  if (!response?.ok) return null;
  try {
    return JSON.parse(body).commit || null;
  } catch {
    return null;
  }
}

// 1. Which commit is live
let commit = await liveCommit();
if (expectedCommit && waitForCommitMs > 0) {
  const deadline = Date.now() + waitForCommitMs;
  while (commit !== expectedCommit && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 15_000));
    commit = await liveCommit();
  }
}
if (expectedCommit) {
  log(
    commit === expectedCommit,
    `live commit ${commit ? commit.slice(0, 7) : "unknown"} (expected ${expectedCommit.slice(0, 7)})`,
  );
} else {
  lines.push(
    `INFO live commit ${commit ? commit.slice(0, 7) : "unknown (no version endpoint yet)"}`,
  );
  console.log(lines.at(-1));
}

// 2. The bare domain reaches the site
const apexResult = await get(`${apex}/?check=${Date.now()}`);
log(
  Boolean(apexResult.response?.ok) && apexResult.response.url.includes("lethela.co.za"),
  `${apex}/ -> ${apexResult.response?.status ?? apexResult.error?.message} (ends at ${apexResult.response?.url ?? "-"})`,
);

// 3. Public pages on the main domain
for (const page of pages) {
  const url = `${primary}${page.path}${page.path.includes("?") ? "&" : "?"}check=${Date.now()}`;
  const { response, body, error, ms } = await get(url);
  if (!response) {
    log(false, `${page.path} -> ${error?.message}`);
    continue;
  }
  const missing = (page.contains || []).filter((text) => !body.includes(text));
  const ok = (page.status ? response.status === page.status : response.ok) && missing.length === 0;
  // On a pull request the live site still runs the old code, so a check for behaviour the
  // pull request adds is only reported.
  if (!ok && page.status && process.env.LIVE_CHECK_PULL_REQUEST === "true") {
    lines.push(`NOTE ${page.path} -> ${response.status} (expected ${page.status} once merged)`);
    console.log(lines.at(-1));
    continue;
  }
  log(
    ok,
    `${page.path} -> ${response.status} in ${ms} ms${missing.length ? `, missing "${missing.join('", "')}"` : ""}`,
  );
}

// 4. The sitemap's first lastmod shows when the live build ran
const sitemap = await get(`${primary}/sitemap.xml?check=${Date.now()}`);
const lastmod = sitemap.body?.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
lines.push(`INFO sitemap lastmod ${lastmod || "unknown"}`);
console.log(lines.at(-1));

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Live site check\n\n\`\`\`\n${lines.join("\n")}\n\`\`\`\n`,
  );
}

if (failed) process.exitCode = 1;
