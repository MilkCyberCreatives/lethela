import assert from "node:assert/strict";
import test from "node:test";
import {
  isGoogleAuthEnabled,
  normalizeOAuthIntent,
  OAUTH_INTENT_COOKIE,
  roleForOAuthIntent,
} from "../src/lib/google-auth";

test("direct Google OAuth is only enabled when both credentials are configured", () => {
  const previousId = process.env.GOOGLE_CLIENT_ID;
  const previousSecret = process.env.GOOGLE_CLIENT_SECRET;
  try {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    assert.equal(isGoogleAuthEnabled(), false);

    process.env.GOOGLE_CLIENT_ID = "client-id.apps.googleusercontent.com";
    assert.equal(isGoogleAuthEnabled(), false);

    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    assert.equal(isGoogleAuthEnabled(), true);

    process.env.GOOGLE_CLIENT_ID = "   ";
    assert.equal(isGoogleAuthEnabled(), false);
  } finally {
    if (previousId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previousId;
    if (previousSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = previousSecret;
  }
});

test("the OAuth sign-up intent only recognises the three account types", () => {
  assert.equal(normalizeOAuthIntent("vendor"), "vendor");
  assert.equal(normalizeOAuthIntent("rider"), "rider");
  assert.equal(normalizeOAuthIntent("customer"), "customer");
  assert.equal(normalizeOAuthIntent("admin"), "customer");
  assert.equal(normalizeOAuthIntent(null), "customer");
  assert.equal(normalizeOAuthIntent(undefined), "customer");
});

test("each sign-up intent maps to the matching account role", () => {
  assert.equal(roleForOAuthIntent("vendor"), "VENDOR");
  assert.equal(roleForOAuthIntent("rider"), "RIDER");
  assert.equal(roleForOAuthIntent("customer"), "CUSTOMER");
});

test("the intent cookie name is stable", () => {
  assert.equal(OAUTH_INTENT_COOKIE, "lethela.oauth-intent");
});
