import { after } from "next/server";
import { prisma, prismaRuntimeInfo } from "@/lib/db";
import {
  createDispatchAssignment,
  ensureOrderOperationsTables,
  recordOrderEvent,
} from "@/lib/order-operations";
import {
  claimOrderNotification,
  notifyAdminsOfOrder,
  notifyOrderStatusPush,
  notifyRiderOfAssignment,
  remindRiderOfPickup,
  remindStoreOfPaidOrder,
} from "@/lib/order-notifications";
import { settleWithin } from "@/lib/notification-channels";
import { pusherServer } from "@/lib/pusher-server";

// Lethela runs delivery, so a paid order should reach the customer without an
// admin stepping in. Riders are offered orders automatically; admins only hear
// about the orders that get stuck. Approvals, refunds and payouts stay manual.

const PAID_STATUSES = ["PAID", "SUCCESS"];
const RIDER_BUSY_STATUSES = ["RIDER_ASSIGNED", "PICKED_UP", "ON_THE_WAY"];
export const AUTO_DISPATCH_ACTOR = "system:auto-dispatch";

const MINUTE = 60 * 1000;
export const STORE_REMINDER_AFTER_MS = 5 * MINUTE;
export const STORE_ESCALATE_AFTER_MS = 15 * MINUTE;
export const RIDER_REMINDER_AFTER_MS = 15 * MINUTE;
export const RIDER_ESCALATE_AFTER_MS = 30 * MINUTE;
// Older orders are left alone so a deploy never sends alerts about old orders.
const SWEEP_LOOKBACK_MS = 6 * 60 * MINUTE;
const SWEEP_EVERY_MS = MINUTE;

function marker(index: number) {
  return prismaRuntimeInfo.provider === "postgresql" ? `$${index}` : "?";
}

function lower(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function parseZones(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map(lower).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function ridersWhoDeclined(orderId: string) {
  await ensureOrderOperationsTables();
  const rows = await prisma.$queryRawUnsafe<Array<{ actor: string | null }>>(
    `SELECT actor FROM app_order_events WHERE order_id = ${marker(1)} AND type = 'RIDER_ASSIGNMENT_DECLINED'`,
    orderId,
  );
  return new Set(
    rows
      .map((row) => String(row.actor || ""))
      .filter((actor) => actor.startsWith("rider:"))
      .map((actor) => actor.slice("rider:".length)),
  );
}

type RiderCandidate = {
  id: string;
  suburb: string;
  city: string;
  township: string;
  preferredZones: string;
};

/**
 * Orders the riders who are online and free, best first: riders in the store's
 * suburb or zones, then its city, then whoever has had the fewest deliveries today.
 */
export function rankRiders(
  riders: RiderCandidate[],
  vendor: { suburb: string | null; city: string | null },
  deliveriesToday: Map<string, number>,
) {
  const suburb = lower(vendor.suburb);
  const city = lower(vendor.city);
  const score = (rider: RiderCandidate) => {
    const local = [lower(rider.suburb), lower(rider.township), ...parseZones(rider.preferredZones)];
    if (suburb && local.includes(suburb)) return 2;
    if (city && lower(rider.city) === city) return 1;
    return 0;
  };
  return [...riders].sort(
    (a, b) =>
      score(b) - score(a) ||
      (deliveriesToday.get(a.id) || 0) - (deliveriesToday.get(b.id) || 0) ||
      a.id.localeCompare(b.id),
  );
}

async function availableRiders(
  orderId: string,
  vendor: { suburb: string | null; city: string | null },
) {
  const [riders, busy, declined] = await Promise.all([
    prisma.riderApplication.findMany({
      where: { status: "APPROVED", availableNow: true },
      select: { id: true, suburb: true, city: true, township: true, preferredZones: true },
      take: 200,
    }),
    prisma.order.findMany({
      where: { status: { in: RIDER_BUSY_STATUSES }, assignedRiderId: { not: null } },
      select: { assignedRiderId: true },
    }),
    ridersWhoDeclined(orderId),
  ]);
  const busyIds = new Set(busy.map((order) => order.assignedRiderId));
  const free = riders.filter((rider) => !busyIds.has(rider.id) && !declined.has(rider.id));
  if (free.length === 0) return [];

  const since = new Date(Date.now() - 24 * 60 * MINUTE);
  const recent = await prisma.order.groupBy({
    by: ["assignedRiderId"],
    where: { assignedRiderId: { in: free.map((rider) => rider.id) }, createdAt: { gte: since } },
    _count: { _all: true },
  });
  const deliveriesToday = new Map(
    recent.map((row) => [String(row.assignedRiderId), row._count._all] as const),
  );
  return rankRiders(free, vendor, deliveriesToday);
}

/**
 * Gives a paid order that is ready for pickup to the best free rider who is online.
 * Returns the order's status afterwards: RIDER_ASSIGNED, or READY_FOR_PICKUP when
 * no rider could take it (the admins are then told by the READY_FOR_PICKUP alert).
 */
export async function autoDispatchOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      publicId: true,
      ozowReference: true,
      status: true,
      paymentStatus: true,
      assignedRiderId: true,
      vendor: { select: { suburb: true, city: true } },
    },
  });
  if (!order) return null;
  if (order.status !== "READY_FOR_PICKUP" || order.assignedRiderId) return order.status;
  if (!PAID_STATUSES.includes(order.paymentStatus.toUpperCase())) return order.status;

  const candidates = await availableRiders(order.id, order.vendor);
  for (const candidate of candidates) {
    // Only one request can move the order out of READY_FOR_PICKUP.
    const claimed = await prisma.order.updateMany({
      where: { id: order.id, status: "READY_FOR_PICKUP", assignedRiderId: null },
      data: { status: "RIDER_ASSIGNED", assignedRiderId: candidate.id, statusReason: null },
    });
    if (claimed.count === 0) return "RIDER_ASSIGNED";

    const rider = await prisma.riderApplication.findUnique({
      where: { id: candidate.id },
      select: { id: true, fullName: true, phone: true, status: true, availableNow: true },
    });
    if (!rider || rider.status !== "APPROVED" || !rider.availableNow) {
      // The rider went offline while we were choosing; put the order back and try the next one.
      await prisma.order.updateMany({
        where: { id: order.id, status: "RIDER_ASSIGNED", assignedRiderId: candidate.id },
        data: { status: "READY_FOR_PICKUP", assignedRiderId: null },
      });
      continue;
    }

    await createDispatchAssignment({
      orderId: order.id,
      publicId: order.publicId,
      riderApplicationId: rider.id,
      riderName: rider.fullName,
      riderPhone: rider.phone,
      note: "Assigned automatically",
      actor: AUTO_DISPATCH_ACTOR,
    });
    await recordOrderEvent({
      orderId: order.id,
      publicId: order.publicId,
      type: "RIDER_ASSIGNED",
      actor: AUTO_DISPATCH_ACTOR,
      note: "Assigned automatically",
      meta: { riderId: rider.id, riderName: rider.fullName },
    });
    try {
      await pusherServer.trigger(`order-${order.ozowReference || order.publicId}`, "status", {
        status: "RIDER_ASSIGNED",
        at: new Date().toISOString(),
      });
    } catch {
      // realtime may be disabled
    }
    // The assignment is saved even if a message cannot go out.
    await notifyRiderOfAssignment(order.id, rider.id).catch(() => null);
    return "RIDER_ASSIGNED";
  }
  return "READY_FOR_PICKUP";
}

/**
 * Runs after an order becomes ready for pickup (the store marked it ready, a rider
 * declined, or an admin moved it back) and sends the matching status messages.
 */
export async function dispatchReadyOrder(orderId: string) {
  const status = (await autoDispatchOrder(orderId).catch(() => null)) || "READY_FOR_PICKUP";
  await settleWithin(notifyOrderStatusPush(orderId, status), 3000);
  return status;
}

/** Offers every paid order still waiting for a rider, oldest first. */
export async function dispatchWaitingOrders(limit = 10) {
  const waiting = await prisma.order.findMany({
    where: {
      status: "READY_FOR_PICKUP",
      assignedRiderId: null,
      paymentStatus: { in: PAID_STATUSES },
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true },
  });
  let assigned = 0;
  for (const order of waiting) {
    const status = await autoDispatchOrder(order.id).catch(() => null);
    if (status !== "RIDER_ASSIGNED") continue;
    assigned += 1;
    await settleWithin(notifyOrderStatusPush(order.id, "RIDER_ASSIGNED"), 3000);
  }
  return assigned;
}

let automationRunsTable: Promise<unknown> | null = null;

function ensureAutomationRunsTable() {
  automationRunsTable ??= prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_automation_runs (
      name TEXT PRIMARY KEY,
      ran_at TEXT NOT NULL
    )
  `);
  return automationRunsTable;
}

/** Lets one server run the sweep per minute, however many requests ask for it. */
async function claimSweep(now: Date) {
  await ensureAutomationRunsTable();
  const changed = await prisma.$executeRawUnsafe(
    `INSERT INTO app_automation_runs (name, ran_at) VALUES (${marker(1)}, ${marker(2)})
     ON CONFLICT (name) DO UPDATE SET ran_at = excluded.ran_at
     WHERE app_automation_runs.ran_at < ${marker(3)}`,
    "order-sweep",
    now.toISOString(),
    new Date(now.getTime() - SWEEP_EVERY_MS).toISOString(),
  );
  return Number(changed) > 0;
}

async function latestAssignmentTimes(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, string>();
  await ensureOrderOperationsTables();
  const rows = await prisma.$queryRawUnsafe<Array<{ order_id: string; created_at: string }>>(
    `SELECT order_id, MAX(created_at) AS created_at FROM app_order_dispatches
     WHERE order_id IN (${orderIds.map((_, index) => marker(index + 1)).join(", ")})
     GROUP BY order_id`,
    ...orderIds,
  );
  return new Map(rows.map((row) => [row.order_id, String(row.created_at)] as const));
}

/**
 * Chases orders that are waiting too long: reminds the store or rider first, then
 * tells the admins. Each message goes out once per order.
 */
export async function runOrderSweep(options: { force?: boolean } = {}) {
  const now = new Date();
  if (!options.force && !(await claimSweep(now))) return { ran: false as const };

  const assigned = await dispatchWaitingOrders();
  const since = new Date(now.getTime() - SWEEP_LOOKBACK_MS);

  const [unaccepted, awaitingPickup] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: "NEW",
        paymentStatus: { in: PAID_STATUSES },
        createdAt: { gte: since },
      },
      select: { id: true, createdAt: true, paymentCallbackAt: true },
      take: 50,
    }),
    prisma.order.findMany({
      where: {
        status: "RIDER_ASSIGNED",
        assignedRiderId: { not: null },
        paymentStatus: { in: PAID_STATUSES },
        createdAt: { gte: since },
      },
      select: { id: true, assignedRiderId: true, updatedAt: true },
      take: 50,
    }),
  ]);

  let reminders = 0;
  let escalations = 0;
  for (const order of unaccepted) {
    const waited = now.getTime() - (order.paymentCallbackAt || order.createdAt).getTime();
    if (waited >= STORE_REMINDER_AFTER_MS) {
      if (await claimOrderNotification(order.id, "store-reminder", "auto")) {
        reminders += 1;
        await remindStoreOfPaidOrder(order.id).catch(() => null);
      }
    }
    if (waited >= STORE_ESCALATE_AFTER_MS) {
      if (await claimOrderNotification(order.id, "store-slow", "auto")) {
        escalations += 1;
        await notifyAdminsOfOrder(order.id, "store-slow").catch(() => null);
      }
    }
  }

  const assignedAt = await latestAssignmentTimes(awaitingPickup.map((order) => order.id));
  for (const order of awaitingPickup) {
    const riderId = String(order.assignedRiderId);
    const startedAt = assignedAt.get(order.id);
    const waited = now.getTime() - (startedAt ? new Date(startedAt) : order.updatedAt).getTime();
    if (waited >= RIDER_REMINDER_AFTER_MS) {
      if (await claimOrderNotification(order.id, `rider-reminder:${riderId}`, "auto")) {
        reminders += 1;
        await remindRiderOfPickup(order.id, riderId).catch(() => null);
      }
    }
    if (waited >= RIDER_ESCALATE_AFTER_MS) {
      if (await claimOrderNotification(order.id, `rider-slow:${riderId}`, "auto")) {
        escalations += 1;
        await notifyAdminsOfOrder(order.id, "rider-slow").catch(() => null);
      }
    }
  }

  return { ran: true as const, assigned, reminders, escalations };
}

/**
 * Runs the sweep after the response is sent. Pages that people keep open (the
 * dashboards' notification bell, the admin page and a customer's order page) call
 * this when they refresh, so no separate scheduler is needed.
 */
export function scheduleOrderSweep() {
  try {
    after(() => runOrderSweep().catch(() => null));
  } catch {
    // Outside a request (for example in tests) there is nothing to schedule.
  }
}
