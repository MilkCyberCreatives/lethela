import test from "node:test";
import assert from "node:assert/strict";
import { buildOzowRedirectUrl, createOrderReference } from "../src/lib/ozow";

test("createOrderReference uses the expected LET prefix", () => {
  const ref = createOrderReference();
  assert.match(ref, /^LET-[A-Z0-9]+-[A-F0-9]{8}$/);
});

test("buildOzowRedirectUrl carries the expected payment parameters", () => {
  const url = buildOzowRedirectUrl({
    siteCode: "SITE1",
    privateKey: "secret",
    amountCents: 2599,
    transactionReference: "LET-123",
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    notifyUrl: "https://example.com/notify",
    isTest: true,
  });

  const parsed = new URL(url);
  assert.equal(parsed.origin, "https://pay.ozow.com");
  assert.equal(parsed.searchParams.get("SiteCode"), "SITE1");
  assert.equal(parsed.searchParams.get("Amount"), "25.99");
  assert.equal(parsed.searchParams.get("IsTest"), "true");
  assert.ok(parsed.searchParams.get("HashCheck"));
});
