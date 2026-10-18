import assert from "node:assert/strict";
import test from "node:test";
import { autoApprovalEnabled } from "../src/lib/auto-approval";
import { GUEST_EMAIL_DOMAIN, isGuestEmail, normalizeGuestPhone } from "../src/lib/guest-customers";

test("stores and riders are approved automatically unless turned off", () => {
  const before = process.env.AUTO_APPROVE_ACCOUNTS;
  try {
    delete process.env.AUTO_APPROVE_ACCOUNTS;
    assert.equal(autoApprovalEnabled(), true);
    process.env.AUTO_APPROVE_ACCOUNTS = "false";
    assert.equal(autoApprovalEnabled(), false);
  } finally {
    if (before === undefined) delete process.env.AUTO_APPROVE_ACCOUNTS;
    else process.env.AUTO_APPROVE_ACCOUNTS = before;
  }
});

test("guest customers are grouped by phone number in one form", () => {
  assert.equal(normalizeGuestPhone("082 123 4567"), "27821234567");
  assert.equal(normalizeGuestPhone("+27 82 123 4567"), "27821234567");
  assert.equal(isGuestEmail(`guest-27821234567@${GUEST_EMAIL_DOMAIN}`), true);
  assert.equal(isGuestEmail("someone@example.com"), false);
});
