import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/auth-roles";
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
import { absoluteUrl } from "@/lib/site";
import {
  formatSaDay,
  formatVisitorReportText,
  saDayKey,
  saDayWindow,
  saHour,
  shiftSaDay,
  summariseVisitorDay,
  type ReportEvent,
  type ReportVisitor,
  type ReportWindow,
  type VisitorDaySummary,
  type WeekComparison,
} from "@/lib/visitor-report";

const REPORT_EVENT_TYPES = ["page_view", "vendor_click", "product_add", "search", "whatsapp_click"];
const PAID_STATUSES = ["PAID", "SUCCESS"];
const MAX_EVENTS = 60_000;

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    out.push(items.slice(index, index + size));
  return out;
}

export async function loadVisitorDay(window: ReportWindow): Promise<VisitorDaySummary> {
  const range = { gte: window.start, lt: window.end };
  const events: ReportEvent[] = await prisma.visitorEvent.findMany({
    where: { createdAt: range, type: { in: REPORT_EVENT_TYPES } },
    select: {
      visitorId: true,
      userId: true,
      type: true,
      path: true,
      vendorSlug: true,
      searchQuery: true,
      metaJson: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
    take: MAX_EVENTS,
  });

  const visitorIds = [...new Set(events.map((event) => event.visitorId))];
  const userIds = [...new Set(events.map((event) => event.userId).filter(Boolean))] as string[];

  const visitors: ReportVisitor[] = [];
  for (const ids of chunk(visitorIds, 5_000)) {
    visitors.push(
      ...(await prisma.visitor.findMany({
        where: { id: { in: ids } },
        select: { id: true, userAgent: true, createdAt: true },
      })),
    );
  }

  const staffUserIds = new Set<string>();
  for (const ids of chunk(userIds, 5_000)) {
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, role: true },
    });
    for (const user of users) if (isAdminRole(user.role)) staffUserIds.add(user.id);
  }

  const [orders, customers, stores, riders, liveStores] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: range },
      select: { userId: true, paymentStatus: true },
    }),
    prisma.user.count({ where: { createdAt: range, role: "CUSTOMER" } }),
    prisma.vendor.count({ where: { createdAt: range } }),
    prisma.riderApplication.count({ where: { createdAt: range } }),
    prisma.vendor.count({ where: { isActive: true, status: { in: ["ACTIVE", "APPROVED"] } } }),
  ]);

  const signedInCustomers = new Set(orders.map((order) => order.userId).filter(Boolean));
  return summariseVisitorDay({
    window,
    events,
    visitors,
    staffUserIds,
    orders: {
      placed: orders.length,
      paid: orders.filter((order) => PAID_STATUSES.includes(order.paymentStatus)).length,
      // Guest orders can't be matched to a visitor, so each counts as one customer.
      customers: signedInCustomers.size + orders.filter((order) => !order.userId).length,
    },
    signups: { customers, stores, riders },
    liveStores,
  });
}

async function countVisitors(start: Date, end: Date) {
  const rows = await prisma.visitorEvent.groupBy({
    by: ["visitorId"],
    where: { type: "page_view", createdAt: { gte: start, lt: end } },
  });
  return rows.length;
}

export async function loadWeekComparison(dayKey: string): Promise<WeekComparison> {
  const end = saDayWindow(dayKey).end;
  const start = saDayWindow(shiftSaDay(dayKey, -6)).start;
  const previousStart = saDayWindow(shiftSaDay(dayKey, -13)).start;
  const [visitors, previousVisitors, paidOrders] = await Promise.all([
    countVisitors(start, end),
    countVisitors(previousStart, start),
    prisma.order.count({
      where: { createdAt: { gte: start, lt: end }, paymentStatus: { in: PAID_STATUSES } },
    }),
  ]);
  return { visitors, previousVisitors, paidOrders };
}

function reportRecipients() {
  return {
    emails: splitCsv(
      process.env.ADMIN_NOTIFICATION_EMAILS || process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    ),
    whatsapp: splitCsv(process.env.ADMIN_NOTIFICATION_WHATSAPP_TO)
      .map(normalizeWhatsAppRecipient)
      .filter(Boolean),
  };
}

export function getVisitorReportChannelStatus() {
  const { emails, whatsapp } = reportRecipients();
  return {
    email: hasEmailChannel() && emails.length > 0,
    whatsapp: hasWhatsAppChannel() && whatsapp.length > 0,
  };
}

function textToHtml(text: string, reportUrl: string) {
  const body = text
    .split("\n")
    .map((line) => {
      if (!line.trim()) return "";
      if (line.startsWith("Full report: ")) {
        return `<p style="margin:16px 0 0"><a href="${escapeHtml(reportUrl)}" style="color:#B5001B">Open the full report</a></p>`;
      }
      return `<p style="margin:0 0 6px">${escapeHtml(line)}</p>`;
    })
    .join("");
  return `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">${body}</div>`;
}

function logChannelError(channel: string) {
  return (error: unknown) => {
    console.warn(`Daily visitor report: ${channel} not sent.`, (error as Error)?.message || error);
  };
}

export type VisitorReportResult = {
  status: "sent" | "already-sent" | "too-early" | "no-channel" | "failed";
  dayKey: string;
  channels?: string[];
};

/**
 * Sends yesterday's visitor report to the admins once per South African day, from
 * 06:00 SA time. Safe to call repeatedly: later calls that day do nothing.
 */
export async function sendDailyVisitorReport(now = new Date()): Promise<VisitorReportResult> {
  const dayKey = shiftSaDay(saDayKey(now), -1);
  if (saHour(now) < 6) return { status: "too-early", dayKey };

  const channels = getVisitorReportChannelStatus();
  if (!channels.email && !channels.whatsapp) return { status: "no-channel", dayKey };

  if (!(await claimOrderNotification("visitor-report", dayKey, "daily"))) {
    return { status: "already-sent", dayKey };
  }

  try {
    const summary = await loadVisitorDay(saDayWindow(dayKey));
    // Mondays also cover the week just ended.
    const isMonday = new Date(`${saDayKey(now)}T00:00:00.000Z`).getUTCDay() === 1;
    const week = isMonday ? await loadWeekComparison(dayKey) : null;
    const reportUrl = absoluteUrl(`/admin/visitors?day=${dayKey}`);
    const text = formatVisitorReportText(summary, { reportUrl, week });
    const { emails, whatsapp } = reportRecipients();

    const delivered: string[] = [];
    await Promise.all([
      channels.whatsapp
        ? settleWithin(
            sendTwilioWhatsApp({ to: whatsapp, body: text }).then((result) => {
              if (result.delivered) delivered.push("whatsapp");
            }, logChannelError("WhatsApp")),
            10_000,
          )
        : null,
      channels.email
        ? settleWithin(
            sendResendEmail({
              to: emails,
              subject: `Lethela visitors for ${formatSaDay(dayKey)}: ${summary.visitors} people, ${summary.funnel.paid} paid orders`,
              text,
              html: textToHtml(text, reportUrl),
            }).then((result) => {
              if (result.delivered) delivered.push("email");
            }, logChannelError("email")),
            10_000,
          )
        : null,
    ]);

    if (delivered.length === 0) {
      await releaseOrderNotification("visitor-report", dayKey, "daily");
      return { status: "failed", dayKey };
    }
    return { status: "sent", dayKey, channels: delivered };
  } catch (error) {
    await releaseOrderNotification("visitor-report", dayKey, "daily").catch(() => null);
    throw error;
  }
}
