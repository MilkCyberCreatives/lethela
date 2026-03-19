import test from "node:test";
import assert from "node:assert/strict";
import { createRiderConsoleToken, readRiderConsoleToken } from "../src/lib/rider-console";

test("rider console tokens round-trip and normalize refs", () => {
  process.env.RIDER_CONSOLE_SECRET = "test-secret";

  const token = createRiderConsoleToken("let-123");
  const payload = readRiderConsoleToken(token);

  assert.ok(payload);
  assert.equal(payload?.ref, "LET-123");
});

test("rider console tokens reject tampering", () => {
  process.env.RIDER_CONSOLE_SECRET = "test-secret";

  const token = createRiderConsoleToken("LET-123");
  const tampered = `${token}broken`;

  assert.equal(readRiderConsoleToken(tampered), null);
});
