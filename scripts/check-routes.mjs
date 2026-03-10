// /scripts/check-routes.mjs
// Scans /src/app (and /app) for invalid catch-all routes like .../[...slug]/something/route.ts
import fs from "node:fs";
import path from "node:path";

const roots = [
  path.join(process.cwd(), "src", "app"),
  path.join(process.cwd(), "app"),
];

const CATCHALL_RE = /^\[\.\.\.(.+)\]$/; // e.g. "[...nextauth]"

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    results.push(full);
    if (e.isDirectory()) walk(full, results);
  }
  return results;
}

function hasChildrenAfterCatchAll(absPath, root) {
  // If a folder segment is [...x], ensure it is the last segment before file (page.tsx/route.ts)
  const rel = path.relative(root, absPath);
  const parts = rel.split(path.sep).filter(Boolean);

  // Check each segment; if it's catch-all and not the last folder segment before a file, flag it.
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    const isCatch = CATCHALL_RE.test(seg);
    if (!isCatch) continue;
    // Look at anything after this segment in the path
    const after = parts.slice(i + 1);

    // If there are *any* folders after, then it's illegal.
    // Acceptable endings are exactly "[...x]/page.tsx" or "[...x]/route.ts"
    if (after.length === 0) continue; // folder itself, fine
    if (after.length === 1 && (after[0] === "page.tsx" || after[0] === "route.ts")) continue;

    // Otherwise: illegal (e.g. "[...x]/foo/route.ts", or "[...x]/foo/bar", etc.)
    return { rel, offendingSegment: seg, remainder: after.join(path.sep) };
  }
  return null;
}

function scanRoot(root) {
  const all = walk(root);
  const offenders = [];

  for (const p of all) {
    const stat = fs.statSync(p);
    if (!stat.isFile()) continue;
    const ext = path.extname(p);
    const base = path.basename(p);
    // Only consider route-bearing files
    if (base !== "page.tsx" && base !== "route.ts") continue;

    const issue = hasChildrenAfterCatchAll(p, root);
    if (issue) offenders.push(issue);
  }
  return offenders;
}

let totalOffenders = 0;

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  const offenders = scanRoot(root);
  if (offenders.length) {
    console.log(`\n❌ Offending routes under: ${root}`);
    for (const o of offenders) {
      console.log(`  - ${o.rel}`);
      console.log(`    ↳ catch-all segment: ${o.offendingSegment}  | remainder after it: ${o.remainder}`);
    }
    totalOffenders += offenders.length;
  }
}

if (totalOffenders === 0) {
  console.log("✅ No invalid catch-all routes found.");
  process.exit(0);
} else {
  console.log(`\nFound ${totalOffenders} invalid route path(s). Fix the ones listed above.`);
  process.exit(1);
}
