import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config.mjs";

const protectedSources = [
  "/admin/:path*",
  "/owner-access",
  "/vendors/dashboard/:path*",
  "/rider/dashboard/:path*",
  "/account/:path*",
  "/profile/:path*",
  "/api/admin/:path*",
  "/api/vendor/:path*",
  "/api/vendors/:path*",
  "/api/riders/:path*",
  "/api/me/:path*",
  "/api/files/:path*",
  "/api/storage/:path*",
  "/api/upload/:path*",
  "/api/payments/:path*",
];

test("private dashboard and user-data routes cannot be publicly cached or indexed", async () => {
  assert.equal(nextConfig.poweredByHeader, false);
  assert.equal(typeof nextConfig.headers, "function");

  const rules = await nextConfig.headers!();

  for (const source of protectedSources) {
    const rule = rules.find((candidate) => candidate.source === source);
    assert.ok(rule, `Missing private response rule for ${source}`);

    const headers = new Map(
      rule.headers.map((header) => [header.key.toLowerCase(), header.value.toLowerCase()]),
    );

    assert.match(headers.get("cache-control") || "", /private/);
    assert.match(headers.get("cache-control") || "", /no-store/);
    assert.match(headers.get("x-robots-tag") || "", /noindex/);
    assert.equal(headers.get("cross-origin-resource-policy"), "same-origin");
  }
});
