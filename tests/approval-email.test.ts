import assert from "node:assert/strict";
import test from "node:test";
import { buildApprovalEmail } from "../src/lib/approval-email";
import { approvalBroadcastActive, isBroadcastableEmail } from "../src/lib/approval-broadcast";

test("approval emails carry the Lethela logo, a button and plain text", () => {
  for (const audience of ["vendor", "rider", "buyer"] as const) {
    const email = buildApprovalEmail({ audience, name: "Thabo Mokoena", storeName: "Mama's Kota" });
    assert.match(email.html, /\/email\/lethela-logo\.png/);
    assert.match(email.html, /Approved/);
    assert.match(email.text, /^Hi Thabo,/);
    assert.ok(email.subject.includes("Lethela"));
    assert.ok(email.whatsapp.length < 600);
  }
  const store = buildApprovalEmail({ audience: "vendor", storeName: "Mama's Kota" });
  assert.equal(store.subject, "Mama's Kota is approved on Lethela");
  assert.match(store.html, /Mama&#039;s Kota is approved/);
});

test("unfinished stores are told exactly what is still needed", () => {
  const email = buildApprovalEmail({
    audience: "vendor",
    storeName: "New vendor",
    missing: ["Store address", "Products or menu"],
  });
  assert.equal(email.subject, "Your Lethela store account is approved");
  assert.match(email.text, /1\. Store address\n2\. Products or menu/);
});

test("approval emails never mention prices or fees in rand", () => {
  for (const audience of ["vendor", "rider", "buyer"] as const) {
    assert.doesNotMatch(buildApprovalEmail({ audience }).text, /R\s?\d/);
  }
});

test("test, demo and guest addresses are never emailed", () => {
  assert.equal(isBroadcastableEmail("thabo@gmail.com"), true);
  assert.equal(isBroadcastableEmail("store@test.local"), false);
  assert.equal(isBroadcastableEmail("a@vendors.lethela.test"), false);
  assert.equal(isBroadcastableEmail("demo@example.com"), false);
  assert.equal(isBroadcastableEmail("guest-27821234567@guest.lethela.invalid"), false);
  assert.equal(isBroadcastableEmail(""), false);
});

test("the approval broadcast can be turned off and ends on its own", () => {
  const before = process.env.APPROVAL_BROADCAST_ENABLED;
  try {
    delete process.env.APPROVAL_BROADCAST_ENABLED;
    assert.equal(approvalBroadcastActive(new Date("2026-10-18T10:00:00Z")), true);
    assert.equal(approvalBroadcastActive(new Date("2026-11-01T00:00:00Z")), false);
    process.env.APPROVAL_BROADCAST_ENABLED = "false";
    assert.equal(approvalBroadcastActive(new Date("2026-10-18T10:00:00Z")), false);
  } finally {
    if (before === undefined) delete process.env.APPROVAL_BROADCAST_ENABLED;
    else process.env.APPROVAL_BROADCAST_ENABLED = before;
  }
});
