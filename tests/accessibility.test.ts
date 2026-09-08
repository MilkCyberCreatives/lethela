import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("root layout provides a keyboard skip link to the main content", () => {
  const layout = source("src/app/layout.tsx");
  assert.match(layout, /href="#main-content"/);
  assert.match(layout, /Skip to main content/);
  // Visually hidden until focused, so it never affects the visual design.
  assert.match(layout, /sr-only focus:not-sr-only/);
  // The skip target must exist and be programmatically focusable.
  assert.match(layout, /id="main-content"\s+tabIndex=\{-1\}/);
});

test("document language is declared for assistive tech", () => {
  const layout = source("src/app/layout.tsx");
  assert.match(layout, /<html lang="en-ZA"/);
});
