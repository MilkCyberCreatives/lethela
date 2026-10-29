import { adminAiComplete } from "@/lib/admin-ai";
import { prisma } from "@/lib/db";
import { GUEST_EMAIL_DOMAIN } from "@/lib/guest-customers";
import {
  escapeHtml,
  hasEmailChannel,
  hasWhatsAppChannel,
  normalizeWhatsAppRecipient,
  sendResendEmail,
  sendTwilioWhatsApp,
  settleWithin,
  splitCsv,
} from "@/lib/notification-channels";
import { claimOrderNotification, releaseOrderNotification } from "@/lib/order-notifications";
import { ONLINE_PAID_STATUSES, CONFIRMED_PAYMENT_STATUSES } from "@/lib/payment-status";
import { listRecentPlatformMessages } from "@/lib/platform-messages";
import { getOperatingSummary, loadNudgeAccounts } from "@/lib/profile-nudges";
import { absoluteUrl } from "@/lib/site";
import { formatSaDay, saDayKey, saDayWindow, saHour, shiftSaDay } from "@/lib/visitor-report";
import { loadVisitorDay } from "@/lib/visitor-report-data";

/**
 * The admins' morning brief: yesterday in numbers, what is stuck right now and a short to-do
 * list. It only reads data. /admin/ai shows it any time, and .github/workflows/daily-agents.yml
 * sends it to the admins once a day.
 */

const OPEN_ORDER_STATUSES = [
  "PAID",
  "NEW",
  "VENDOR_ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "ON_THE_WAY",
];
const STUCK_ORDER_MS = 45 * 60 * 1000;

export type BriefAccount = {
  audience: "vendor" | "rider";
  id: string;
  name: string;
  hasPhone: boolean;
  missing: string[];
  daysSinceSignup: number;
};

export type DailyBrief = {
  dayKey: string;
  dayLabel: string;
  generatedAt: string;
  orders: {
    placed: number;
    paid: number;
    delivered: number;
    cancelled: number;
    paidValueCents: number;
    openNow: number;
    stuckNow: number;
    refundsWaiting: number;
  };
  signups: { customers: number; stores: number; riders: number };
  stores: { registered: number; orderable: number; unfinished: number };
  riders: { registered: number; ready: number; online: number; unfinished: number };
  topMissing: Array<{ label: string; count: number }>;
  unfinishedAccounts: BriefAccount[];
  requests: {
    supportLast7Days: number;
    kasiLast7Days: number;
    townships: Array<{ name: string; count: number }>;
  };
  visitors: { people: number; reachedCheckout: number; dropOff: string | null } | null;
  emailSetUp: boolean;
  actions: string[];
};

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

const isAre = (count: number) => (count === 1 ? "is" : "are");
const hasHave = (count: number) => (count === 1 ? "has" : "have");

/** The rule-based to-do list, most urgent first. Works with no AI key. */
export function buildBriefActions(brief: Omit<DailyBrief, "actions">): string[] {
  const actions: string[] = [];
  const { orders, stores, riders, topMissing, unfinishedAccounts, requests } = brief;

  if (orders.stuckNow > 0) {
    actions.push(
      `${plural(orders.stuckNow, "paid order")} ${hasHave(orders.stuckNow)} been open for more than 45 minutes. Open Operations in /admin and phone the store or rider.`,
    );
  }
  if (orders.refundsWaiting > 0) {
    actions.push(
      `${plural(orders.refundsWaiting, "order")} ${isAre(orders.refundsWaiting)} waiting for a refund. Refund in Ozow, then mark it refunded in /admin.`,
    );
  }
  if (stores.orderable === 0) {
    const missing = topMissing[0];
    actions.push(
      stores.unfinished > 0
        ? `No store can take orders yet. Phone the ${plural(stores.unfinished, "unfinished store")}${missing ? `; most are missing "${missing.label}"` : ""}. The AI desk can write the WhatsApp message.`
        : "No store can take orders yet. Sign up stores in Klipfontein View in person and help them add one menu item, an open day and their address.",
    );
  } else if (stores.orderable < 5) {
    actions.push(
      `Only ${plural(stores.orderable, "store")} can take orders. Aim for 5 to 10 in Klipfontein View so customers have a choice.`,
    );
  }
  if (riders.ready === 0) {
    actions.push(
      riders.unfinished > 0
        ? `No rider is ready to deliver. Help the ${plural(riders.unfinished, "unfinished rider")} finish their profile.`
        : "No rider has signed up yet. Recruit 3 to 5 riders in Klipfontein View.",
    );
  } else if (riders.online === 0 && stores.orderable > 0) {
    actions.push(
      "No rider is online right now. Ask a ready rider to open the rider dashboard and tap Go online.",
    );
  }
  const phoneless = unfinishedAccounts.filter((account) => !account.hasPhone).length;
  if (phoneless > 0) {
    actions.push(
      `${plural(phoneless, "unfinished account")} ${hasHave(phoneless)} no phone number, so only email can reach them.`,
    );
  }
  if (requests.kasiLast7Days > 0 && requests.townships[0]) {
    actions.push(
      `${plural(requests.kasiLast7Days, "person", "people")} asked for Lethela in their kasi this week, most from ${requests.townships[0].name}. Note it for the next area.`,
    );
  }
  if (requests.supportLast7Days > 0) {
    actions.push(
      `${plural(requests.supportLast7Days, "support request")} came in this week. Check Messages in /admin.`,
    );
  }
  if (!brief.emailSetUp) {
    actions.push(
      "Lethela email is not set up yet, so reminders and approval emails do not arrive. See the email line on /admin/launch-checklist.",
    );
  }
  if (actions.length === 0) {
    actions.push("Nothing urgent. Keep sharing the store and rider sign-up links.");
  }
  return actions;
}

export async function loadDailyBrief(now = new Date()): Promise<DailyBrief> {
  const dayKey = shiftSaDay(saDayKey(now), -1);
  const window = saDayWindow(dayKey);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const range = { gte: window.start, lt: window.end };

  const [
    placed,
    paid,
    delivered,
    cancelled,
    paidValue,
    openNow,
    stuckNow,
    refundsWaiting,
    customers,
    stores,
    riders,
    summary,
    accounts,
    publicMessages,
    visitorDay,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: range } }),
    prisma.order.count({
      where: { createdAt: range, paymentStatus: { in: CONFIRMED_PAYMENT_STATUSES } },
    }),
    prisma.order.count({ where: { updatedAt: range, status: "DELIVERED" } }),
    prisma.order.count({ where: { updatedAt: range, status: "CANCELLED" } }),
    prisma.order.aggregate({
      _sum: { totalCents: true },
      where: { createdAt: range, paymentStatus: { in: ONLINE_PAID_STATUSES } },
    }),
    prisma.order.count({
      where: {
        status: { in: OPEN_ORDER_STATUSES },
        paymentStatus: { in: CONFIRMED_PAYMENT_STATUSES },
      },
    }),
    prisma.order.count({
      where: {
        status: { in: OPEN_ORDER_STATUSES },
        paymentStatus: { in: CONFIRMED_PAYMENT_STATUSES },
        createdAt: { lt: new Date(now.getTime() - STUCK_ORDER_MS), gte: weekAgo },
      },
    }),
    prisma.order.count({ where: { status: "REFUND_REQUESTED" } }),
    prisma.user.count({
      where: {
        createdAt: range,
        role: "CUSTOMER",
        NOT: { email: { endsWith: `@${GUEST_EMAIL_DOMAIN}` } },
      },
    }),
    prisma.vendor.count({ where: { createdAt: range } }),
    prisma.riderApplication.count({ where: { createdAt: range } }),
    getOperatingSummary(),
    loadNudgeAccounts(),
    listRecentPlatformMessages(100, "public").catch(() => []),
    loadVisitorDay(window).catch(() => null),
  ]);

  const recent = publicMessages.filter((message) => new Date(message.createdAt) >= weekAgo);
  const kasi = recent.filter((message) => String(message.recipientType) === "KASI_REQUEST");
  const townships = countBy(
    kasi.map((message) => {
      try {
        return String(JSON.parse(message.body)?.township || "").trim() || "Unknown";
      } catch {
        return "Unknown";
      }
    }),
  ).slice(0, 5);

  const topMissing = countBy(accounts.flatMap((account) => account.missing))
    .slice(0, 5)
    .map(({ name, count }) => ({ label: name, count }));

  const base: Omit<DailyBrief, "actions"> = {
    dayKey,
    dayLabel: formatSaDay(dayKey),
    generatedAt: now.toISOString(),
    orders: {
      placed,
      paid,
      delivered,
      cancelled,
      paidValueCents: paidValue._sum.totalCents || 0,
      openNow,
      stuckNow,
      refundsWaiting,
    },
    signups: { customers, stores, riders },
    stores: {
      registered: summary.stores.registered,
      orderable: summary.stores.orderable,
      unfinished: summary.stores.unfinished,
    },
    riders: {
      registered: summary.riders.registered,
      ready: summary.riders.ready,
      online: summary.riders.online,
      unfinished: summary.riders.unfinished,
    },
    topMissing,
    unfinishedAccounts: accounts.slice(0, 25).map((account) => ({
      audience: account.audience,
      id: account.id,
      name:
        (account.audience === "vendor" ? account.storeName : account.name) ||
        account.name ||
        "No name yet",
      hasPhone: Boolean(account.phone),
      missing: account.missing,
      daysSinceSignup: Math.max(
        0,
        Math.floor((now.getTime() - account.createdAt.getTime()) / 86_400_000),
      ),
    })),
    requests: {
      supportLast7Days: recent.filter((message) => String(message.recipientType) === "SUPPORT_CASE")
        .length,
      kasiLast7Days: kasi.length,
      townships,
    },
    visitors: visitorDay
      ? {
          people: visitorDay.visitors,
          reachedCheckout: visitorDay.funnel.reachedCheckout,
          dropOff: visitorDay.dropOff?.headline || null,
        }
      : null,
    emailSetUp: summary.reminders.emailSetUp && hasEmailChannel(),
  };
  return { ...base, actions: buildBriefActions(base) };
}

function rands(cents: number) {
  return `R${(cents / 100).toFixed(2)}`;
}

export function formatBriefText(brief: DailyBrief, aiNote?: string | null) {
  const lines = [
    `Lethela morning brief for ${brief.dayLabel}`,
    "",
    `Orders yesterday: ${brief.orders.placed} placed, ${brief.orders.paid} paid (${rands(brief.orders.paidValueCents)} online), ${brief.orders.delivered} delivered, ${brief.orders.cancelled} cancelled.`,
    `Right now: ${brief.orders.openNow} open, ${brief.orders.stuckNow} older than 45 minutes, ${brief.orders.refundsWaiting} waiting for a refund.`,
    `Sign-ups yesterday: ${brief.signups.customers} customers, ${brief.signups.stores} stores, ${brief.signups.riders} riders.`,
    `Stores: ${brief.stores.orderable} of ${brief.stores.registered} can take orders (${brief.stores.unfinished} unfinished).`,
    `Riders: ${brief.riders.ready} of ${brief.riders.registered} ready, ${brief.riders.online} online now.`,
  ];
  if (brief.visitors) {
    lines.push(
      `Website yesterday: ${brief.visitors.people} people, ${brief.visitors.reachedCheckout} reached checkout.`,
    );
  }
  lines.push("", "To do today:");
  brief.actions.forEach((action, index) => lines.push(`${index + 1}. ${action}`));
  if (aiNote) lines.push("", "AI note:", aiNote);
  lines.push("", `Open the AI desk: ${absoluteUrl("/admin/ai")}`);
  return lines.join("\n");
}

/** A short "what to focus on" note from the AI, or null when no AI key is set. */
export async function writeBriefAiNote(brief: DailyBrief) {
  const facts = { ...brief, unfinishedAccounts: brief.unfinishedAccounts.slice(0, 10) };
  const result = await adminAiComplete(
    "Write a short morning note (at most 5 bullet points) for the Lethela owner: what matters most today and one concrete next step each. Use only the facts given. Do not repeat every number.",
    JSON.stringify(facts),
    { maxTokens: 450 },
  );
  return result?.text || null;
}

function briefRecipients() {
  return {
    emails: splitCsv(
      process.env.ADMIN_NOTIFICATION_EMAILS || process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    ),
    whatsapp: splitCsv(process.env.ADMIN_NOTIFICATION_WHATSAPP_TO)
      .map(normalizeWhatsAppRecipient)
      .filter(Boolean),
  };
}

export function dailyBriefEnabled() {
  return process.env.DAILY_BRIEF_ENABLED?.trim().toLowerCase() !== "false";
}

export type DailyBriefResult = {
  status: "sent" | "too-early" | "no-channel" | "already-sent" | "failed" | "off";
  dayKey: string;
};

/** Sends the brief to the admins once per South African day, from 06:00. */
export async function sendDailyBrief(now = new Date()): Promise<DailyBriefResult> {
  const dayKey = shiftSaDay(saDayKey(now), -1);
  if (!dailyBriefEnabled()) return { status: "off", dayKey };
  if (saHour(now) < 6) return { status: "too-early", dayKey };

  const recipients = briefRecipients();
  const canEmail = hasEmailChannel() && recipients.emails.length > 0;
  const canWhatsApp = hasWhatsAppChannel() && recipients.whatsapp.length > 0;
  if (!canEmail && !canWhatsApp) return { status: "no-channel", dayKey };

  if (!(await claimOrderNotification("daily-brief", dayKey, "daily"))) {
    return { status: "already-sent", dayKey };
  }

  try {
    const brief = await loadDailyBrief(now);
    const aiNote = await writeBriefAiNote(brief);
    const text = formatBriefText(brief, aiNote);
    const delivered: string[] = [];
    await Promise.all([
      canWhatsApp
        ? settleWithin(
            sendTwilioWhatsApp({ to: recipients.whatsapp, body: text }).then((result) => {
              if (result.delivered) delivered.push("whatsapp");
            }),
            10_000,
          )
        : null,
      canEmail
        ? settleWithin(
            sendResendEmail({
              to: recipients.emails,
              subject: `Lethela morning brief: ${brief.actions.length} to do, ${brief.stores.orderable} stores open for orders`,
              text,
              html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;font-size:14px;line-height:1.5">${escapeHtml(text)}</pre>`,
            }).then((result) => {
              if (result.delivered) delivered.push("email");
            }),
            10_000,
          )
        : null,
    ]);
    if (delivered.length === 0) {
      await releaseOrderNotification("daily-brief", dayKey, "daily");
      return { status: "failed", dayKey };
    }
    return { status: "sent", dayKey };
  } catch (error) {
    await releaseOrderNotification("daily-brief", dayKey, "daily").catch(() => null);
    throw error;
  }
}
