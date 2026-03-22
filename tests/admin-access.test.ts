import test from "node:test";
import assert from "node:assert/strict";
import { createAdminAccessToken, readAdminAccessToken } from "../src/lib/admin-access";

function withAdminAccessEnv(fn: () => void) {
  const previousAdminKey = process.env.ADMIN_APPROVAL_KEY;
  const previousAuthSecret = process.env.NEXTAUTH_SECRET;

  process.env.ADMIN_APPROVAL_KEY = "super-secret-admin-key";
  process.env.NEXTAUTH_SECRET = "test-auth-secret";

  try {
    fn();
  } finally {
    if (previousAdminKey === undefined) {
      delete process.env.ADMIN_APPROVAL_KEY;
    } else {
      process.env.ADMIN_APPROVAL_KEY = previousAdminKey;
    }

    if (previousAuthSecret === undefined) {
      delete process.env.NEXTAUTH_SECRET;
    } else {
      process.env.NEXTAUTH_SECRET = previousAuthSecret;
    }
  }
}

test("admin access token round-trips with a configured admin key", () => {
  withAdminAccessEnv(() => {
    const token = createAdminAccessToken({ expiresInDays: 1 });
    const payload = readAdminAccessToken(token);

    assert.ok(payload);
    assert.equal(typeof payload?.exp, "number");
  });
});

test("admin access token is rejected when tampered with", () => {
  withAdminAccessEnv(() => {
    const token = createAdminAccessToken({ expiresInDays: 1 });
    const [encoded] = token.split(".");
    const tampered = `${encoded}.invalid-signature`;

    assert.equal(readAdminAccessToken(tampered), null);
  });
});

test("admin access token becomes invalid once the admin key is unavailable", () => {
  withAdminAccessEnv(() => {
    const token = createAdminAccessToken({ expiresInDays: 1 });
    delete process.env.ADMIN_APPROVAL_KEY;

    assert.equal(readAdminAccessToken(token), null);
  });
});
