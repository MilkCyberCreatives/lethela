// /scripts/find-catchall-issues.mjs
// Node >=18
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const offenders = {
  pathsWithCatchallNotLast: [],
  catchallDirsWithChildren: [],
  middlewareMatchers: [],
  rewriteIssues: [],
  pagesRouterPresent: false,
};

const ALLOWED_FILES_IN_CATCHALL = new Set([
  "page.tsx","page.jsx",
  "route.ts","route.js",
  "layout.tsx","layout.jsx",
  "loading.tsx","loading.jsx",
  "error.tsx","error.jsx",
  "head.tsx","head.jsx",
  "not-found.tsx","not-found.jsx",
  // colocation is allowed, but we only warn when there are **subdirectories**
]);

function walk(dir) {
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of ents) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      const rel = p.replace(root, "").replaceAll("\\", "/");

      // detect pages router presence
      if (rel === "/src/pages") offenders.pagesRouterPresent = true;

      // If a directory name is catch-all: [...slug] or [[...slug]]
      const isCatchAll = /\[(?:\.\.\.|\[\.\.\.)[^\]]+\]/.test(ent.name);
      if (isCatchAll) {
        // If **any** child directory exists under this dir -> invalid
        const children = fs.readdirSync(p, { withFileTypes: true });
        const hasSubDir = children.some(c => c.isDirectory());
        if (hasSubDir) {
          offenders.catchallDirsWithChildren.push(rel);
        }
        // If this path contains *more* segments after the catch-all in the path itself
        // e.g. /app/vendors/[...slug]/menu
        const parts = rel.split("/").filter(Boolean);
        const catchallIdx = parts.findIndex(x => /\[(?:\.\.\.|\[\.\.\.)[^\]]+\]/.test(x));
        if (catchallIdx !== -1 && catchallIdx < parts.length - 1) {
          offenders.pathsWithCatchallNotLast.push(rel);
        }
      }

      walk(p);
    }
  }
}

// scan repo
walk(root);

// check middleware matcher
const middlewarePath = path.join(root, "middleware.ts");
if (fs.existsSync(middlewarePath)) {
  const txt = fs.readFileSync(middlewarePath, "utf8");
  const matcherLine = txt.match(/matcher\s*:\s*\[([\s\S]*?)\]/m);
  if (matcherLine) {
    const body = matcherLine[1];
    if (/\[.*\]/.test(body)) {
      offenders.middlewareMatchers.push("middleware.ts contains bracket-style dynamic segments in matcher[]; use globs like \"/vendor/:path*\" only.");
    }
    if (/\.{3}/.test(body)) {
      offenders.middlewareMatchers.push("middleware.ts matcher[] likely uses spread-like syntax; ensure it's plain globs.");
    }
  }
}

// check next.config.mjs rewrites
const nextConfigPath = path.join(root, "next.config.mjs");
if (fs.existsSync(nextConfigPath)) {
  const txt = fs.readFileSync(nextConfigPath, "utf8");
  // naive check: destination paths with a catch-all followed by more segments
  const badDest = txt.match(/destination:\s*["'`](.*?)["'`]/g) || [];
  for (const m of badDest) {
    const dest = m.split(/destination:\s*/)[1].trim().replace(/['`,]/g,"");
    const parts = dest.split("?")[0].split("/").filter(Boolean);
    const idx = parts.findIndex(x => x.startsWith("[..."));
    if (idx !== -1 && idx < parts.length - 1) {
      offenders.rewriteIssues.push(`Rewrite destination has catch-all not last: ${dest}`);
    }
  }
}

// print report
const ok = Object.values(offenders).every(v =>
  Array.isArray(v) ? v.length === 0 : v === false
);

if (offenders.pagesRouterPresent) {
  console.log("❗ Detected /src/pages (Pages Router) alongside App Router. Delete /src/pages/ entirely.");
}
if (offenders.pathsWithCatchallNotLast.length) {
  console.log("\n❌ Catch-all not last in path:");
  offenders.pathsWithCatchallNotLast.forEach(x => console.log("  -", x));
}
if (offenders.catchallDirsWithChildren.length) {
  console.log("\n❌ Catch-all directory has child directories (not allowed):");
  offenders.catchallDirsWithChildren.forEach(x => console.log("  -", x));
}
if (offenders.middlewareMatchers.length) {
  console.log("\n❌ middleware.ts matcher issues:");
  offenders.middlewareMatchers.forEach(x => console.log("  -", x));
}
if (offenders.rewriteIssues.length) {
  console.log("\n❌ next.config.mjs rewrite destination issues:");
  offenders.rewriteIssues.forEach(x => console.log("  -", x));
}

if (ok) {
  console.log("\n✅ No catch-all issues detected.");
  process.exit(0);
} else {
  console.log("\n⚠️  Fix the above items and re-run.");
  process.exit(1);
}
