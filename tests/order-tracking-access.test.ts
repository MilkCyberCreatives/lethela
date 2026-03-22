import test from "node:test";
import assert from "node:assert/strict";
import {
  createOrderTrackingToken,
  getOrderRealtimeChannel,
  verifyOrderTrackingToken,
} from "@/lib/order-tracking-access";

const previousAuthSecret = process.env.NEXTAUTH_SECRET;

test.beforeEach(() => {
  process.env.NEXTAUTH_SECRET = "tracking-secret";
});

test.after(() => {
  if (previousAuthSecret === undefined) {
    delete process.env.NEXTAUTH_SECRET;
  } else {
    process.env.NEXTAUTH_SECRET = previousAuthSecret;
  }
});

test("tracking token validates for the matching order reference", () => {
  const token = createOrderTrackingToken("LET-12345");
  assert.equal(verifyOrderTrackingToken(token, "LET-12345"), true);
});

test("tracking token is rejected for a different order reference", () => {
  const token = createOrderTrackingToken("LET-12345");
  assert.equal(verifyOrderTrackingToken(token, "LET-99999"), false);
});

test("realtime channel name is deterministic and opaque", () => {
  const channelA = getOrderRealtimeChannel("LET-12345");
  const channelB = getOrderRealtimeChannel("LET-12345");
  const channelC = getOrderRealtimeChannel("LET-99999");

  assert.equal(channelA, channelB);
  assert.notEqual(channelA, channelC);
  assert.equal(channelA.includes("LET-12345"), false);
});
