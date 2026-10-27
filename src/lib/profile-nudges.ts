import { prisma } from "@/lib/db";
import { buildApprovalEmail } from "@/lib/approval-email";
import { isBroadcastableEmail } from "@/lib/approval-broadcast";
import {
  hasEmailChannel,
  hasWhatsAppChannel,
  sendResendEmail,
  sendTwilioWhatsApp,
} from "@/lib/notification-channels";
import { claimOrderNotification, releaseOrderNotification } from "@/lib/order-notifications";
import { getRiderReadiness } from "@/lib/rider-readiness";
import {
  getVendorReadiness,
  hasRealStoreName,
  isPublicReadyVendor,
  isTestStoreName,
} from "@/lib/vendor-readiness";

// Gauta (26 Oct 2026): get Lethela operating. Stores and riders go live on their own once their
// profile has what an order needs (PR #74), but most never finished it. This reminds each
// unfinished store and rider, by email and WhatsApp, exactly what is still missing: a first
// reminder a day after sign-up, then every 3 days, at most 3 times, only in daytime (SA time).
// Set PROFILE_NUDGES_ENABLED=false to stop it.
export const PROFILE_NUDGE_PREFIX = "nudge:profile:";
export const MAX_PROFILE_NUDGES = 3;
const FIRST_NUDGE_AFTER_MS = 24 * 60 * 60 * 1000;
const NUDGE_GAP_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_SENDS_PER_RUN = 15;
const MAX_RUN_MS = 30_000;
const GAP_BETWEEN_SENDS_MS = 600;

export type NudgeAccount = {
  audience: "vendor" | "rider";
  id: string;
  email: string;
  phone: string | null;
  name: string | null;
  storeName: string | null;
  createdAt: Date;
  missing: string[];
};

export function profileNudgesEnabled() {
  return process.env.PROFILE_NUDGES_ENABLED?.trim().toLowerCase() !== "false";
}

/** 07:00 to 18:00 in South Africa (UTC+2, no daylight saving). */
export function isDaytimeInSouthAfrica(now = new Date()) {
  const hour = (now.getUTCHours() + 2) % 24;
  return hour >= 7 && hour < 18;
}

/**
 * Which reminder (1, 2 or 3) an account is due, or null. `sent` is how many reminders it has
 * had and `lastSentAt` when the latest went out.
 */
export function dueNudgeNumber(
  account: { createdAt: Date },
  sent: number,
  lastSentAt: Date | null,
  now = new Date(),
) {
  if (sent >= MAX_PROFILE_NUDGES) return null;
  if (sent === 0) {
    return now.getTime() - account.createdAt.getTime() >= FIRST_NUDGE_AFTER_MS ? 1 : null;
  }
  if (!lastSentAt || now.getTime() - lastSentAt.getTime() < NUDGE_GAP_MS) return null;
  return sent + 1;
}

const vendorSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  status: true,
  isActive: true,
  createdAt: true,
  address: true,
  suburb: true,
  city: true,
  province: true,
  township: true,
  storeType: true,
  cuisine: true,
  etaMins: true,
  owner: { select: { name: true, email: true } },
  _count: { select: { products: true, items: true, hours: { where: { closed: false } } } },
} as const;

async function loadVendors() {
  const vendors = await prisma.vendor.findMany({
    where: { status: { not: "SUSPENDED" } },
    select: vendorSelect,
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  return vendors
    .filter((vendor) => !(hasRealStoreName(vendor.name) && isTestStoreName(vendor.name)))
    .filter((vendor) =>
      [vendor.email, vendor.owner?.email].filter(Boolean).every((e) => isBroadcastableEmail(e)),
    )
    .map((vendor) => {
      const input = {
        ...vendor,
        productCount: vendor._count.products,
        menuItemCount: vendor._count.items,
        operatingHoursCount: vendor._count.hours,
      };
      const readiness = getVendorReadiness(input);
      return {
        vendor,
        orderable: isPublicReadyVendor(input),
        missing: readiness.checks
          .filter((check) => check.required && !check.complete)
          .map((check) => check.label),
      };
    });
}

async function loadRiders() {
  const riders = await prisma.riderApplication.findMany({
    where: { status: { not: "SUSPENDED" } },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  return riders
    .filter((rider) => isBroadcastableEmail(rider.email))
    .map((rider) => ({ rider, missing: getRiderReadiness(rider).missing }));
}

/** Unfinished stores and riders that can be reminded, stores first. */
export async function loadNudgeAccounts(): Promise<NudgeAccount[]> {
  const [vendors, riders] = await Promise.all([loadVendors(), loadRiders()]);
  const accounts: NudgeAccount[] = [];
  for (const { vendor, missing } of vendors) {
    const email = (vendor.owner?.email || vendor.email || "").trim().toLowerCase();
    if (!missing.length || !email) continue;
    accounts.push({
      audience: "vendor",
      id: vendor.id,
      email,
      phone: vendor.phone || null,
      name: vendor.owner?.name || null,
      storeName: vendor.name,
      createdAt: vendor.createdAt,
      missing,
    });
  }
  for (const { rider, missing } of riders) {
    if (!missing.length) continue;
    accounts.push({
      audience: "rider",
      id: rider.id,
      email: rider.email.trim().toLowerCase(),
      phone: rider.phone || null,
      name: rider.fullName || null,
      storeName: null,
      createdAt: rider.createdAt,
      missing,
    });
  }
  return accounts;
}

/**
 * Counts only, no names or contact details: how close Lethela is to taking real orders. Shown by
 * the public /api/ops/readiness endpoint and the live site check.
 */
export async function getOperatingSummary() {
  const [vendors, riders, history, lastError] = await Promise.all([
    loadVendors(),
    loadRiders(),
    loadNudgeHistory(),
    loadLastNudgeError(),
  ]);
  const reminders = [...history.values()];
  const lastSentAt = reminders.reduce<Date | null>(
    (latest, entry) =>
      entry.lastSentAt && (!latest || entry.lastSentAt > latest) ? entry.lastSentAt : latest,
    null,
  );
  const missingCounts = (rows: Array<{ missing: string[] }>) => {
    const counts: Record<string, number> = {};
    for (const row of rows)
      for (const label of row.missing) counts[label] = (counts[label] || 0) + 1;
    return counts;
  };
  const unfinishedVendors = vendors.filter((row) => row.missing.length > 0);
  const unfinishedRiders = riders.filter((row) => row.missing.length > 0);
  const readyRiders = riders.filter((row) => row.missing.length === 0);
  return {
    stores: {
      registered: vendors.length,
      orderable: vendors.filter((row) => row.orderable).length,
      unfinished: unfinishedVendors.length,
      missing: missingCounts(unfinishedVendors),
    },
    riders: {
      registered: riders.length,
      ready: readyRiders.length,
      online: readyRiders.filter((row) => row.rider.availableNow).length,
      unfinished: unfinishedRiders.length,
      missing: missingCounts(unfinishedRiders),
    },
    reminders: {
      emailsSent: reminders.reduce((total, entry) => total + entry.sent, 0),
      people: reminders.length,
      lastSentAt: lastSentAt ? new Date(lastSentAt).toISOString() : null,
      emailSetUp: hasEmailChannel(),
      lastError,
    },
  };
}

const NUDGE_ERROR_ID = "nudge:error";

/** Why the email service refused a reminder, without addresses, for the live site check. */
export function describeNudgeError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || "");
  return raw
    .replace(/[^\s@"'<>]+@[^\s@"'<>]+/g, "[address]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

// One row per distinct reason per hour, so a failing email setting shows up without flooding.
async function recordNudgeError(error: unknown) {
  const hour = new Date().toISOString().slice(0, 13);
  await claimOrderNotification(NUDGE_ERROR_ID, describeNudgeError(error) || "unknown", hour);
}

async function loadLastNudgeError() {
  const row = await prisma.appOrderNotificationLog
    .findFirst({
      where: { orderId: NUDGE_ERROR_ID },
      orderBy: { createdAt: "desc" },
      select: { event: true, createdAt: true },
    })
    .catch(() => null);
  return row ? { reason: row.event, at: new Date(row.createdAt).toISOString() } : null;
}

type NudgeHistory = Map<string, { sent: number; lastSentAt: Date | null }>;

async function loadNudgeHistory(): Promise<NudgeHistory> {
  const history: NudgeHistory = new Map();
  const rows = await prisma.appOrderNotificationLog
    .findMany({
      where: { orderId: { startsWith: PROFILE_NUDGE_PREFIX }, channel: "email" },
      select: { event: true, createdAt: true },
    })
    .catch(() => []);
  for (const row of rows) {
    const key = row.event.replace(/^email:/, "");
    const entry = history.get(key) || { sent: 0, lastSentAt: null };
    entry.sent += 1;
    if (!entry.lastSentAt || row.createdAt > entry.lastSentAt) entry.lastSentAt = row.createdAt;
    history.set(key, entry);
  }
  return history;
}

async function sendNudge(account: NudgeAccount, number: number) {
  const nudgeId = `${PROFILE_NUDGE_PREFIX}${number}`;
  const key = `email:${account.email}`;
  if (!(await claimOrderNotification(nudgeId, key, "email"))) return false;

  const message = buildApprovalEmail({
    audience: account.audience,
    kind: "reminder",
    name: account.name,
    storeName: account.storeName,
    missing: account.missing,
  });
  try {
    const result = await sendResendEmail({
      to: account.email,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments,
    });
    if (!result.delivered) throw new Error("Email not sent.");
  } catch (error) {
    // Nothing went out, so try again on a later run.
    await releaseOrderNotification(nudgeId, key, "email").catch(() => null);
    await recordNudgeError(error).catch(() => null);
    return false;
  }

  if (
    account.phone &&
    hasWhatsAppChannel() &&
    (await claimOrderNotification(nudgeId, key, "whatsapp"))
  ) {
    await sendTwilioWhatsApp({ to: account.phone, body: message.whatsapp }).catch(() => null);
  }
  return true;
}

let lastRunAt = 0;

/** Sends the reminders that are due. Called by the order sweep and the daily onboarding cron. */
export async function runProfileNudges(now = new Date()) {
  if (!profileNudgesEnabled() || !hasEmailChannel() || !isDaytimeInSouthAfrica(now)) {
    return { sent: 0 };
  }
  // The order sweep endpoint is open, so one server instance runs at most once a minute.
  if (Date.now() - lastRunAt < 60_000) return { sent: 0 };
  lastRunAt = Date.now();
  const startedAt = Date.now();

  const [accounts, history] = await Promise.all([loadNudgeAccounts(), loadNudgeHistory()]);
  const seen = new Set<string>();
  let sent = 0;
  for (const account of accounts) {
    if (sent >= MAX_SENDS_PER_RUN || Date.now() - startedAt > MAX_RUN_MS) break;
    if (seen.has(account.email)) continue;
    seen.add(account.email);
    const past = history.get(account.email) || { sent: 0, lastSentAt: null };
    const number = dueNudgeNumber(account, past.sent, past.lastSentAt, now);
    if (!number) continue;
    if (await sendNudge(account, number).catch(() => false)) {
      sent += 1;
      await new Promise((resolve) => setTimeout(resolve, GAP_BETWEEN_SENDS_MS));
    }
  }
  return { sent };
}
