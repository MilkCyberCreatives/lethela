import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("admins are alerted when an order is paid", async () => {
  const file = await source("src/app/api/payments/ozow/notify/route.ts");
  assert.match(file, /notifyAdminsOfOrder\(order\.id, "paid"\)/);
});

test("admins are alerted when an order is waiting for a rider", async () => {
  const file = await source("src/lib/order-notifications.ts");
  assert.match(file, /status === "READY_FOR_PICKUP"[\s\S]*notifyAdminsOfOrder\(orderId, "ready"\)/);
  assert.match(file, /ADMIN_NOTIFICATION_EMAILS/);
  assert.match(file, /ADMIN_NOTIFICATION_WHATSAPP_TO/);
});
