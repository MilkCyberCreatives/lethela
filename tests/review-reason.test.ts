import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { z } from "zod";
import { optionalReason } from "@/lib/review-reason";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

// Same shape as the vendor order status route: only a cancellation needs a reason.
const VendorStatusSchema = z
  .object({
    status: z.enum(["VENDOR_ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "CANCELLED"]),
    reason: optionalReason(),
  })
  .refine((value) => value.status !== "CANCELLED" || Boolean(value.reason), {
    path: ["reason"],
  });

test("everyday status changes go through with an empty or missing reason", () => {
  for (const reason of [null, "", "   ", undefined]) {
    const parsed = VendorStatusSchema.safeParse({ status: "VENDOR_ACCEPTED", reason });
    assert.equal(parsed.success, true, `reason ${JSON.stringify(reason)} should be accepted`);
    assert.equal(parsed.success && parsed.data.reason, undefined);
  }
});

test("a reason someone typed still has to be long enough", () => {
  assert.equal(VendorStatusSchema.safeParse({ status: "PREPARING", reason: "abc" }).success, false);
  const parsed = VendorStatusSchema.safeParse({ status: "CANCELLED", reason: "  Out of stock  " });
  assert.equal(parsed.success, true);
  assert.equal(parsed.success && parsed.data.reason, "Out of stock");
});

test("a cancellation still needs a reason", () => {
  for (const reason of [null, "", undefined]) {
    assert.equal(VendorStatusSchema.safeParse({ status: "CANCELLED", reason }).success, false);
  }
});

test("vendor order buttons and admin approvals accept an empty reason", async () => {
  for (const path of [
    "src/app/api/vendors/orders/[id]/route.ts",
    "src/app/api/admin/products/[id]/route.ts",
    "src/app/api/admin/vendors/[id]/liquor/route.ts",
  ]) {
    const route = await source(path);
    assert.match(route, /reason: optionalReason\(\),/, path);
    assert.doesNotMatch(route, /reason: z\.string\(\)\.trim\(\)\.min\(5\)/, path);
  }
});

test("checkout shows a plain sentence when the order details are refused", async () => {
  const route = await source("src/app/api/payments/ozow/create/route.ts");
  assert.match(route, /error: checkoutProblem\(parsed\.error\)/);
  assert.doesNotMatch(route, /parsed\.error\.flatten\(\)/);

  const checkout = await source("src/app/checkout/page.tsx");
  assert.doesNotMatch(checkout, /setError\(json\?\.error \?\? /);
  assert.match(
    checkout,
    /setError\(\s*typeof json\?\.error === "string"\s*\? json\.error\s*: "Please check your order details and try again\.",?\s*\)/,
  );
  for (const [field, max] of [
    ['id="checkout-customer-name"', 120],
    ['id="checkout-phone"', 40],
    ['id="checkout-area"', 140],
    ['aria-label="WhatsApp number"', 40],
    ['aria-label="Stand or house number"', 120],
    ['aria-label="Street, extension or section"', 120],
    ['aria-label="Nearby landmark"', 180],
    ['aria-label="Delivery notes"', 500],
  ] as const) {
    assert.ok(checkout.includes(`${field}\n                    maxLength={${max}}`), field);
  }
});
