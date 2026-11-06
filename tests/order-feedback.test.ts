import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canRateOrderStatus,
  combineAverages,
  firstName,
  orderFeedbackId,
  parseOrderFeedback,
  summarizeRatings,
} from "../src/lib/order-feedback-core";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

// Gauta, 5 Nov 2026: "needs more features". Customers rate delivered orders like on
// Mr D and Uber Eats; stores, riders and admins see real ratings instead of a placeholder.
test("only delivered orders can be rated, once per order", () => {
  assert.equal(canRateOrderStatus("DELIVERED"), true);
  assert.equal(canRateOrderStatus("delivered"), true);
  for (const status of ["PENDING_PAYMENT", "PAID", "ON_THE_WAY", "CANCELLED", "", null]) {
    assert.equal(canRateOrderStatus(status), false);
  }
  assert.equal(orderFeedbackId("lth-abc"), "order-feedback-LTH-ABC");
});

test("ratings are parsed safely and summarised", () => {
  const parsed = parseOrderFeedback(
    JSON.stringify({
      orderRef: "LTH-1",
      storeRating: 4.6,
      riderRating: 9,
      comment: "  Hot food  ",
      customerName: "Thandi Mokoena",
    }),
  );
  assert.equal(parsed?.storeRating, 5);
  assert.equal(parsed?.riderRating, null);
  assert.equal(parsed?.comment, "Hot food");
  assert.equal(parsed?.customerName, "Thandi");
  assert.equal(parseOrderFeedback("not json"), null);
  assert.equal(parseOrderFeedback(JSON.stringify({ storeRating: 0 })), null);
  assert.equal(firstName(""), "Customer");

  assert.deepEqual(summarizeRatings([]), { average: null, count: 0 });
  assert.deepEqual(summarizeRatings([5, 4, 4]), { average: 4.3, count: 3 });
  assert.deepEqual(combineAverages({ average: 4, count: 1 }, { average: 5, count: 3 }), {
    average: 4.8,
    count: 4,
  });
  assert.deepEqual(combineAverages({ average: null, count: 0 }, { average: null, count: 0 }), {
    average: null,
    count: 0,
  });
});

test("the rating route checks access, status and rates once", async () => {
  const route = await source("src/app/api/orders/[ref]/feedback/route.ts");
  assert.match(route, /verifyOrderTrackingToken/);
  assert.match(route, /session\.user\.id === order\.userId/);
  assert.match(route, /canRateOrderStatus\(order\.status\)/);
  assert.match(route, /id: orderFeedbackId\(order\.publicId\)/);
  assert.match(route, /checkRateLimit/);
  assert.match(route, /notifyStaff/);
});

test("the order page offers rating, order again, share tracking and help", async () => {
  const [page, aftercare, api] = await Promise.all([
    source("src/app/orders/[ref]/page.tsx"),
    source("src/components/OrderAfterCare.tsx"),
    source("src/app/api/orders/[ref]/route.ts"),
  ]);
  assert.match(page, /<OrderRatingCard/);
  assert.match(page, /<OrderActions/);
  assert.match(aftercare, /How was your order\?/);
  assert.match(aftercare, /Order again/);
  assert.match(aftercare, /Share tracking/);
  assert.match(aftercare, /Get help with this order/);
  // The browser never loads the database client.
  assert.doesNotMatch(aftercare, /@\/lib\/db|order-feedback"/);
  assert.match(api, /sharePath/);
  assert.match(api, /canRate:/);
});

test("stores, riders and admins see real ratings, not the 4.4 placeholder", async () => {
  const [operations, panel, earnings, rider, admin, trust] = await Promise.all([
    source("src/app/api/vendors/operations/route.ts"),
    source("src/components/dashboard/FeedbackPanel.tsx"),
    source("src/app/api/riders/me/earnings/route.ts"),
    source("src/components/rider/RiderOperationsPanel.tsx"),
    source("src/components/admin/AdminPublicRequests.tsx"),
    source("src/lib/customer-experience.ts"),
  ]);
  assert.doesNotMatch(operations, /rating: vendor\.rating/);
  assert.match(operations, /getStoreRatingSummary/);
  assert.match(panel, /What customers say/);
  assert.match(earnings, /getRiderRatingSummary/);
  assert.match(rider, /Customer rating/);
  assert.match(admin, /Customer ratings/);
  assert.doesNotMatch(admin, /@\/lib\/order-feedback"/);
  assert.match(trust, /listStoreFeedback/);
});
