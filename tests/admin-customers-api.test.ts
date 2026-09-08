import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("admin customers API enforces the shared admin guard before any query", async () => {
  const route = await source("src/app/api/admin/customers/route.ts");
  assert.match(route, /import \{ requireAdminRequest \} from "@\/lib\/admin-auth"/);
  const guardIndex = route.indexOf("await requireAdminRequest(req)");
  const firstQueryIndex = route.indexOf("prisma.user");
  assert.ok(guardIndex > 0, "route must call requireAdminRequest");
  assert.ok(
    guardIndex < firstQueryIndex,
    "the admin guard must run before the first database query",
  );
  assert.match(
    route,
    /return NextResponse\.json\(\s*\{ ok: false, error: guard\.error \},\s*\{ status: guard\.status \}/,
  );
});

test("admin customers API only lists customer accounts and never leaks secret fields", async () => {
  const route = await source("src/app/api/admin/customers/route.ts");
  assert.match(route, /role: \{ in: CUSTOMER_ROLES \}/);
  assert.match(route, /CUSTOMER_ROLES = \["CUSTOMER", "USER"\]/);
  // The select list must not expose credential or banking material.
  const selectBlock = route.slice(route.indexOf("select: {"), route.indexOf("_count:"));
  assert.doesNotMatch(selectBlock, /passwordHash|bankAccount|kyc|twoFactor|sessionVersion/i);
});

test("admin customers API bounds page size and is timeout-guarded", async () => {
  const route = await source("src/app/api/admin/customers/route.ts");
  assert.match(route, /MAX_PAGE_SIZE = 100/);
  assert.match(
    route,
    /clampInt\(url\.searchParams\.get\("pageSize"\), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE\)/,
  );
  assert.match(route, /withQueryTimeout\(/);
  assert.match(route, /pageCount: Math\.max\(1, Math\.ceil\(total \/ pageSize\)\)/);
});

test("admin customers status is verification-aware so it never flags a step the site does not require", async () => {
  const route = await source("src/app/api/admin/customers/route.ts");
  assert.match(route, /import \{ isEmailVerificationRequired \} from "@\/lib\/email-verification"/);
  assert.match(route, /const verificationRequired = isEmailVerificationRequired\(\)/);
  // Locked always wins; unverified only when the platform requires verification;
  // otherwise a plain account reads as "ACTIVE", not "UNVERIFIED".
  assert.match(
    route,
    /locked\s*\?\s*"LOCKED"\s*:\s*row\.emailVerifiedAt\s*\?\s*"VERIFIED"\s*:\s*verificationRequired\s*\?\s*"UNVERIFIED"\s*:\s*"ACTIVE"/s,
  );
});

test("admin customers UI renders the verification-aware status without a redesign of the badge", async () => {
  const admin = await source("src/app/admin/page.tsx");
  assert.match(admin, /status: "VERIFIED" \| "UNVERIFIED" \| "ACTIVE" \| "LOCKED"/);
  assert.match(admin, /customer\.status === "UNVERIFIED"\s*\?\s*"Unverified"/);
  assert.match(admin, /:\s*"Active"/);
});
