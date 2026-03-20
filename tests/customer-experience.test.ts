import test from "node:test";
import assert from "node:assert/strict";
import { isPaidLikeStatus } from "../src/lib/customer-experience";

test("isPaidLikeStatus accepts paid and success states", () => {
  assert.equal(isPaidLikeStatus("PAID"), true);
  assert.equal(isPaidLikeStatus("SUCCESS"), true);
  assert.equal(isPaidLikeStatus("pending"), false);
});
