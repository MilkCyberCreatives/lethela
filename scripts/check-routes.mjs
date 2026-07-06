// /scripts/check-routes.mjs
// Scans /src/app (and /app) for invalid catch-all routes like .../[...slug]/something/route.ts
import fs from "node:fs";
import path from "node:path";

const roots = [path.join(process.cwd(), "src", "app"), path.join(process.cwd(), "app")];

const CATCHALL_RE = /^\[\.\.\.(.+)\]$/; // e.g. "[...nextauth]"

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    results.push(full);
    if (entry.isDirectory()) walk(full, results);
  }
  return results;
}

function hasChildrenAfterCatchAll(absPath, root) {
  const rel = path.relative(root, absPath);
  const parts = rel.split(path.sep).filter(Boolean);

  for (let index = 0; index < parts.length; index += 1) {
    const segment = parts[index];
    if (!CATCHALL_RE.test(segment)) continue;

    const after = parts.slice(index + 1);
    if (after.length === 0) continue;
    if (after.length === 1 && (after[0] === "page.tsx" || after[0] === "route.ts")) continue;

    return { rel, offendingSegment: segment, remainder: after.join(path.sep) };
  }

  return null;
}

function scanRoot(root) {
  const offenders = [];

  for (const itemPath of walk(root)) {
    const stat = fs.statSync(itemPath);
    if (!stat.isFile()) continue;

    const base = path.basename(itemPath);
    if (base !== "page.tsx" && base !== "route.ts") continue;

    const issue = hasChildrenAfterCatchAll(itemPath, root);
    if (issue) offenders.push(issue);
  }

  return offenders;
}

let totalOffenders = 0;

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  const offenders = scanRoot(root);
  if (!offenders.length) continue;

  console.log(`\nERROR: Offending routes under: ${root}`);
  for (const offender of offenders) {
    console.log(`  - ${offender.rel}`);
    console.log(
      `    catch-all segment: ${offender.offendingSegment} | remainder after it: ${offender.remainder}`,
    );
  }
  totalOffenders += offenders.length;
}

if (totalOffenders === 0) {
  console.log("OK: No invalid catch-all routes found.");
  process.exit(0);
}

console.log(`\nFound ${totalOffenders} invalid route path(s). Fix the ones listed above.`);
process.exit(1);
