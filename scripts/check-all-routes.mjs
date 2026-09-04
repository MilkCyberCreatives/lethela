import fs from "node:fs";
import path from "node:path";

const baseUrl = (process.env.E2E_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const manifestPath = path.join(process.cwd(), ".next", "server", "app-paths-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function runnablePath(manifestPathname) {
  let pathname = manifestPathname.replace(/\/(page|route)$/, "") || "/";
  if (pathname === "/_global-error") return null;
  if (pathname === "/_not-found") return "/this-route-must-not-exist";
  pathname = pathname
    .replace("/api/auth/[...nextauth]", "/api/auth/providers")
    .replaceAll("[category]", "kota")
    .replaceAll("[slug]", "hello-tomato")
    .replaceAll("[ref]", "LET-E2E-NOT-FOUND")
    .replaceAll("[id]", "e2e-not-found");
  return pathname;
}

const paths = [...new Set(Object.keys(manifest).map(runnablePath).filter(Boolean))].sort();
const failures = [];
let index = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A cold dev server can drop a connection under concurrent first-hits ("fetch
// failed") even though the route is healthy. Retry transient network errors a
// couple of times before recording a real failure; an HTTP 5xx is never retried.
async function fetchWithRetry(pathname, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetch(`${baseUrl}${pathname}`, {
        redirect: "follow",
        signal: AbortSignal.timeout(90_000),
      });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 750);
    }
  }
  throw lastError;
}

async function worker() {
  while (index < paths.length) {
    const pathname = paths[index++];
    try {
      const response = await fetchWithRetry(pathname);
      if (response.status >= 500) failures.push(`${response.status} ${pathname}`);
      else console.log(`[OK] ${response.status} ${pathname}`);
      await response.body?.cancel();
    } catch (error) {
      failures.push(`ERR ${pathname}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

await Promise.all(Array.from({ length: 6 }, () => worker()));

console.log(`Checked ${paths.length} app pages and route handlers.`);
if (failures.length) {
  console.error(`Failures (${failures.length}):\n${failures.join("\n")}`);
  process.exitCode = 1;
}
