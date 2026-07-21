import test from "node:test";
import assert from "node:assert/strict";
import { hasAdminPermission } from "../src/lib/admin-permissions";

test("admin roles follow least-privilege boundaries", () => {
  assert.equal(hasAdminPermission("OWNER", "staff:manage"), true);
  assert.equal(hasAdminPermission("ADMIN", "staff:manage"), false);
  assert.equal(hasAdminPermission("OPERATIONS_MANAGER", "orders:manage"), true);
  assert.equal(hasAdminPermission("OPERATIONS_MANAGER", "refunds:manage"), false);
  assert.equal(hasAdminPermission("SUPPORT_AGENT", "admin:read"), true);
  assert.equal(hasAdminPermission("SUPPORT_AGENT", "notifications:send"), false);
  assert.equal(hasAdminPermission("FINANCE", "payouts:manage"), true);
  assert.equal(hasAdminPermission("CUSTOMER", "admin:read"), false);
});
