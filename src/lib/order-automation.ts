import { after } from "next/server";
import { prisma, prismaRuntimeInfo } from "@/lib/db";
import { ensureOrderOperationsTables } from "@/lib/order-operations";
import {
  claimOrderNotification,
  notifyAdminsOfOrder,
  notifyOrderStatusPush,
  remindRiderOfPickup,
  remindStoreOfPaidOrder,
} from "@/lib/order-notifications";
import { settleWithin } from "@/lib/notification-channels";
import {
  NO_ACCEPT_ALERT_AFTER_MS,
  WIDEN_AFTER_MS,
  offerOrder,
  resetOpenOffers,
} from "@/lib/rider-offers";

// Lethela runs delivery, so a paid order should reach the customer without an
// admin stepping in. Nearby riders are alerted automatically and the first to
// accept gets the order; admins only hear about the orders that get stuck. Approvals, refunds and payouts stay manual.

const PAID_STATUSES = ["PAID", "SUCCESS"];

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

/**
 * Runs after an order becomes ready for pickup (the store marked it ready, a rider
 * declined, or an admin moved it back): alerts the nearest free riders, the first
 * to accept gets it, and sends the matching status messages. Admins are told at
 * once only when no rider is online to alert.
 */
export async function dispatchReadyOrder(orderId: string) {
  await resetOpenOffers(orderId).catch(() => null);
  const round = await offerOrder(orderId).catch(() => null);
  const ridersAlerted = Boolean(round && round.open > 0);
  await settleWithin(
    notifyOrderStatusPush(orderId, "READY_FOR_PICKUP", { alertAdmins: !ridersAlerted }),
    3000,
  );
  return { ridersAlerted };
}

/**
 * Alerts newly free riders (one came online, declined or delivered) about every
 * paid order still waiting for a rider, oldest first.
 */
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
  let alerted = 0;
  for (const order of waiting) {
    const round = await offerOrder(order.id).catch(() => null);
    alerted += round?.alerted || 0;
  }
  return alerted;
}

/** Widens offers nobody nearby accepted, and tells admins when nobody accepts at all. */
async function chaseUnacceptedOffers(now: Date, since: Date) {
  const waiting = await prisma.order.findMany({
    where: {
      status: "READY_FOR_PICKUP",
      assignedRiderId: null,
      paymentStatus: { in: PAID_STATUSES },
      createdAt: { gte: since },
    },
    select: { id: true },
    take: 50,
  });
  let widened = 0;
  let escalations = 0;
  for (const order of waiting) {
    let round = await offerOrder(order.id).catch(() => null);
    if (!round?.firstOfferedAt) continue;
    const waited = now.getTime() - new Date(round.firstOfferedAt).getTime();
    if (round.wave < 2 && waited >= WIDEN_AFTER_MS) {
      round = (await offerOrder(order.id, { widen: true }).catch(() => null)) || round;
      widened += 1;
    }
    if (waited >= NO_ACCEPT_ALERT_AFTER_MS) {
      if (await claimOrderNotification(order.id, "no-rider-accepted", "auto")) {
        escalations += 1;
        await notifyAdminsOfOrder(order.id, "no-rider-accepted").catch(() => null);
      }
    }
  }
  return { widened, escalations };
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

  const since = new Date(now.getTime() - SWEEP_LOOKBACK_MS);
  const offers = await chaseUnacceptedOffers(now, since);

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
  let escalations = offers.escalations;
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

  return { ran: true as const, widened: offers.widened, reminders, escalations };
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
