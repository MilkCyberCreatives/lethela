import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { vendorApiErrorStatus } from "../src/lib/vendor-api-error";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("admin navigation has one professional destination per dashboard view", async () => {
  const admin = await source("src/app/admin/page.tsx");
  const navBlock = admin.slice(
    admin.indexOf("const ADMIN_NAV_GROUPS"),
    admin.indexOf("const DAILY_OPERATING_PLAYBOOK"),
  );
  const ids = [...navBlock.matchAll(/id: "([a-z]+)"/g)].map((match) => match[1]);

  assert.deepEqual(ids, [
    "overview",
    "operations",
    "orders",
    "vendors",
    "products",
    "riders",
    "users",
    "messages",
    "finance",
  ]);
  assert.equal(new Set(ids).size, ids.length);
});

test("admin live refresh only reloads operational data while the tab is visible", async () => {
  const admin = await source("src/app/admin/page.tsx");
  const pollingBlock = admin.slice(
    admin.indexOf("const timer = window.setInterval"),
    admin.indexOf("async function enableBrowserAlerts"),
  );

  assert.match(pollingBlock, /document\.visibilityState !== "visible"/);
  assert.match(pollingBlock, /loadLiveData/);
  assert.match(pollingBlock, /30000/);
  assert.doesNotMatch(pollingBlock, /void load\(\)/);
});

test("admin attention queue and metrics use canonical live data", async () => {
  const admin = await source("src/app/admin/page.tsx");
  assert.match(admin, /"VENDOR_ACCEPTED"/);
  assert.match(admin, /"READY_FOR_PICKUP"/);
  assert.match(admin, /"RIDER_ASSIGNED"/);
  assert.match(admin, /"ON_THE_WAY"/);
  // Live values come from the canonical stats payload (guarded form is fine).
  assert.match(admin, /stats(\?\.|\s*\?\s*stats\.)availableRiders/);
  assert.match(admin, /stats\?\.completedOrdersToday/);
  assert.doesNotMatch(admin, /label="Riders available now"/);
  assert.doesNotMatch(admin, /label="Completed orders"[\s\S]{0,120}ordersToday/);
});

test("admin header controls are functional rather than decorative", async () => {
  const admin = await source("src/app/admin/page.tsx");
  assert.match(admin, /onSubmit=\{\(event\) =>/);
  assert.match(admin, /onClick=\{onNotifications\}/);
  assert.match(admin, /href="\/contact"/);
  assert.match(admin, /handleGlobalSearch/);
});

test("vendor dashboard reports paid revenue and remains scrollable", async () => {
  const vendor = await source("src/app/vendors/dashboard/page.tsx");
  assert.match(vendor, /\["PAID", "SUCCESS"\]\.includes\(payment\)/);
  assert.match(vendor, /filter\(\(order\) => countsTowardRevenue/);
  assert.match(vendor, /lg:overflow-y-auto lg:pr-3/);
  assert.doesNotMatch(vendor, /lg:overflow-hidden"\s*:\s*"lg:h/);
  assert.match(vendor, /label: "Notifications"/);
  assert.match(vendor, /formatWhatsAppPhone/);
});

test("operations reject zero refunds, duplicate cases and support successful payments", async () => {
  const [route, operations] = await Promise.all([
    source("src/app/api/admin/operations/route.ts"),
    source("src/lib/order-operations.ts"),
  ]);
  assert.match(route, /amountCents: z\.number\(\)\.int\(\)\.positive\(\)/);
  assert.match(route, /\["PAID", "SUCCESS"\]\.includes\(order\.paymentStatus\)/);
  assert.match(route, /hasOpenRefundCase/);
  assert.match(route, /hasDispatchAssignment/);
  assert.match(operations, /Math\.max\(1,/);
});

test("vendor API failures preserve authentication and server-error status meaning", () => {
  assert.equal(
    vendorApiErrorStatus(new Error("Vendor session expired. Please sign in again.")),
    401,
  );
  assert.equal(vendorApiErrorStatus(new Error("Vendor account is awaiting approval.")), 403);
  assert.equal(vendorApiErrorStatus(new Error("Database connection failed.")), 500);
});

test("rider overview and profile use one dashboard shell with accurate labels", async () => {
  const [overview, profile, client] = await Promise.all([
    source("src/app/rider/dashboard/page.tsx"),
    source("src/app/rider/dashboard/profile/page.tsx"),
    source("src/components/rider/RiderDashboardClient.tsx"),
  ]);
  assert.match(overview, /RiderDashboardShell/);
  assert.match(profile, /RiderDashboardShell/);
  assert.match(client, /href="\/rider"/);
  assert.match(client, /label="Assigned deliveries"/);
  assert.match(client, /order\.riderPayoutCents/);
});

test("admin statistics use real availability, completion and paid-only rankings", async () => {
  const stats = await source("src/app/api/admin/stats/route.ts");
  assert.match(stats, /availableNow: true/);
  assert.match(stats, /completedOrdersToday/);
  assert.match(stats, /averageDeliveryMinutes/);
  assert.match(stats, /where: paidOrderWhere\(month\)/);
  assert.match(stats, /revenueMonthCents: financialsMonth\._sum\.platformFeeCents/);
  assert.match(stats, /deliveryFeesMonthCents: financialsMonth\._sum\.deliveryFeeCents/);
  assert.match(stats, /riderTipsMonthCents: financialsMonth\._sum\.riderTipCents/);
  assert.match(stats, /order:\s*\{[\s\S]*paymentStatus: \{ in: \["PAID", "SUCCESS"\] \}/);
});

test("admin global search is server-authorised and bounded", async () => {
  const search = await source("src/app/api/admin/search/route.ts");
  assert.match(search, /requireAdminRequest\(req\)/);
  assert.match(search, /const TAKE = 5/);
  assert.match(search, /prisma\.order\.findMany/);
  assert.match(search, /prisma\.user\.findMany/);
  assert.match(search, /prisma\.vendor\.findMany/);
  assert.match(search, /prisma\.product\.findMany/);
  assert.match(search, /prisma\.riderApplication\.findMany/);
});
