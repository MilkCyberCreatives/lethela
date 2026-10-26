import assert from "node:assert/strict";
import test from "node:test";
import { buildApprovalEmail } from "../src/lib/approval-email";
import { dueNudgeNumber, isDaytimeInSouthAfrica } from "../src/lib/profile-nudges";
import { isTestStoreName } from "../src/lib/vendor-readiness";

const day = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-27T08:00:00Z");

test("a new account gets its first reminder a day after sign-up", () => {
  assert.equal(
    dueNudgeNumber({ createdAt: new Date(now.getTime() - 3_600_000) }, 0, null, now),
    null,
  );
  assert.equal(dueNudgeNumber({ createdAt: new Date(now.getTime() - day) }, 0, null, now), 1);
});

test("old accounts get one reminder at a time, 3 days apart, at most 3", () => {
  const createdAt = new Date("2026-09-01T00:00:00Z");
  assert.equal(dueNudgeNumber({ createdAt }, 0, null, now), 1);
  assert.equal(dueNudgeNumber({ createdAt }, 1, new Date(now.getTime() - 2 * day), now), null);
  assert.equal(dueNudgeNumber({ createdAt }, 1, new Date(now.getTime() - 3 * day), now), 2);
  assert.equal(dueNudgeNumber({ createdAt }, 2, new Date(now.getTime() - 4 * day), now), 3);
  assert.equal(dueNudgeNumber({ createdAt }, 3, new Date(now.getTime() - 30 * day), now), null);
});

test("reminders only go out between 07:00 and 18:00 South African time", () => {
  assert.equal(isDaytimeInSouthAfrica(new Date("2026-10-27T04:59:00Z")), false);
  assert.equal(isDaytimeInSouthAfrica(new Date("2026-10-27T05:00:00Z")), true);
  assert.equal(isDaytimeInSouthAfrica(new Date("2026-10-27T15:59:00Z")), true);
  assert.equal(isDaytimeInSouthAfrica(new Date("2026-10-27T16:00:00Z")), false);
});

test("a store reminder lists exactly what is missing, in email and WhatsApp", () => {
  const email = buildApprovalEmail({
    audience: "vendor",
    kind: "reminder",
    name: "Thandi Mokoena",
    storeName: "T&T's Kitchen",
    missing: ["Opening hours", "Products or menu"],
  });
  assert.equal(email.subject, "T&T's Kitchen is 2 steps away from taking orders");
  assert.match(email.html, /Almost there/);
  assert.doesNotMatch(email.html, />Approved</);
  assert.match(email.text, /1\. Opening hours\n2\. Products or menu/);
  assert.match(email.whatsapp, /- Opening hours\n- Products or menu/);
  assert.match(email.whatsapp, /\/vendors\/dashboard/);
  assert.doesNotMatch(email.text, /R\s?\d/);
});

test("a rider reminder says one step when one thing is left", () => {
  const email = buildApprovalEmail({
    audience: "rider",
    kind: "reminder",
    missing: ["Area you deliver in"],
  });
  assert.equal(email.subject, "You are 1 step away from delivering with Lethela");
  assert.match(email.html, /One step to go/);
});

test("Lethela's own and test stores are never reminded", () => {
  assert.equal(isTestStoreName("Lethela Pilot Kitchen"), true);
  assert.equal(isTestStoreName("Test shop"), true);
  assert.equal(isTestStoreName("Moshidi butchery"), false);
});
