import { prisma, prismaRuntimeInfo } from "@/server/db";
import { hasWhatsAppChannel, sendTwilioWhatsApp } from "@/lib/notification-channels";
import { sendPushToUsers } from "@/lib/push-notifications";

type OrderPayloadItem = {
  name?: string;
  qty?: number;
  priceCents?: number;
  isAlcohol?: boolean;
};

type DeliveryDetails = {
  customerName?: string;
  customerPhone?: string;
  whatsappNumber?: string;
  standNumber?: string;
  streetSection?: string;
  destinationSuburb?: string;
  landmark?: string;
  deliveryNotes?: string;
  containsAlcohol?: boolean;
};

type ParsedOrderPayload = {
  items: OrderPayloadItem[];
  deliveryDetails: DeliveryDetails | null;
};

function rand(cents: number | null | undefined) {
  return `R${((cents || 0) / 100).toFixed(2)}`;
}

function cleanLine(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseOrderPayload(itemsJson: string | null | undefined): ParsedOrderPayload {
  try {
    const parsed = JSON.parse(itemsJson || "[]");
    if (Array.isArray(parsed)) return { items: parsed, deliveryDetails: null };
    return {
      items: Array.isArray(parsed?.items) ? parsed.items : [],
      deliveryDetails:
        parsed?.deliveryDetails && typeof parsed.deliveryDetails === "object"
          ? parsed.deliveryDetails
          : null,
    };
  } catch {
    return { items: [], deliveryDetails: null };
  }
}

export function buildVendorOrderWhatsAppMessage(input: {
  orderRef: string;
  vendorName: string;
  totalCents: number;
  deliveryFeeCents: number;
  items: OrderPayloadItem[];
  deliveryDetails: DeliveryDetails | null;
  dashboardUrl: string;
}) {
  const details = input.deliveryDetails;
  const customerName = cleanLine(details?.customerName) || "Not supplied";
  const customerPhone =
    cleanLine(details?.customerPhone) || cleanLine(details?.whatsappNumber) || "Not supplied";
  const address = [
    cleanLine(details?.standNumber),
    cleanLine(details?.streetSection),
    cleanLine(details?.destinationSuburb),
  ]
    .filter(Boolean)
    .join(", ");
  const itemLines = input.items.slice(0, 8).map((item) => {
    const qty = Number.isFinite(item.qty) && Number(item.qty) > 0 ? Number(item.qty) : 1;
    return `- ${qty} x ${cleanLine(item.name) || "Item"}`;
  });
  const extraItems =
    input.items.length > itemLines.length ? input.items.length - itemLines.length : 0;
  const containsAlcohol =
    Boolean(details?.containsAlcohol) || input.items.some((item) => Boolean(item.isAlcohol));

  return [
    `New paid Lethela order for ${input.vendorName}`,
    `Order: ${input.orderRef}`,
    `Customer: ${customerName}`,
    `Phone: ${customerPhone}`,
    `Address: ${address || "Not supplied"}`,
    details?.landmark ? `Landmark: ${cleanLine(details.landmark)}` : "",
    details?.deliveryNotes ? `Notes: ${cleanLine(details.deliveryNotes)}` : "",
    "Items:",
    ...(itemLines.length ? itemLines : ["- Items are available in the dashboard"]),
    extraItems ? `- plus ${extraItems} more item(s)` : "",
    `Delivery fee: ${rand(input.deliveryFeeCents)}`,
    `Total paid: ${rand(input.totalCents)}`,
    containsAlcohol ? "Alcohol order: check customer ID and age before handover." : "",
    `Dashboard: ${input.dashboardUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function ensureOrderNotificationLog() {
  if (prismaRuntimeInfo.provider === "postgresql") {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS app_order_notification_logs (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        event TEXT NOT NULL,
        channel TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS app_order_notification_logs (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        event TEXT NOT NULL,
        channel TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS app_order_notification_logs_unique
    ON app_order_notification_logs (order_id, event, channel)
  `);
}

async function claimOrderNotification(orderId: string, event: string, channel: string) {
  await ensureOrderNotificationLog();
  const id = `${orderId}:${event}:${channel}`;

  if (prismaRuntimeInfo.provider === "postgresql") {
    const inserted = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        INSERT INTO app_order_notification_logs (id, order_id, event, channel)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (order_id, event, channel) DO NOTHING
        RETURNING id
      `,
      id,
      orderId,
      event,
      channel,
    );
    return inserted.length > 0;
  }

  const inserted = await prisma.$executeRawUnsafe(
    `
      INSERT OR IGNORE INTO app_order_notification_logs (id, order_id, event, channel)
      VALUES (?, ?, ?, ?)
    `,
    id,
    orderId,
    event,
    channel,
  );
  return Number(inserted) > 0;
}

export async function notifyVendorOfPaidOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      publicId: true,
      ozowReference: true,
      itemsJson: true,
      totalCents: true,
      deliveryFeeCents: true,
      userId: true,
      vendor: {
        select: {
          id: true,
          name: true,
          phone: true,
          ownerId: true,
          members: {
            select: { userId: true },
            take: 20,
          },
        },
      },
    },
  });

  const vendorPhone = cleanLine(order?.vendor?.phone);
  if (!order) return { delivered: false as const, reason: "missing-order" };

  const tasks: Promise<unknown>[] = [];
  let whatsappQueued = false;
  let pushQueued = false;

  const parsed = parseOrderPayload(order.itemsJson);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "https://www.lethela.co.za";

  const orderRef = order.publicId || order.ozowReference || orderId;
  const body = buildVendorOrderWhatsAppMessage({
    orderRef,
    vendorName: order.vendor.name,
    totalCents: order.totalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    items: parsed.items,
    deliveryDetails: parsed.deliveryDetails,
    dashboardUrl: `${siteUrl.replace(/\/$/, "")}/vendors/dashboard`,
  });

  if (hasWhatsAppChannel() && vendorPhone) {
    const claimed = await claimOrderNotification(orderId, "paid-order", "whatsapp");
    if (claimed) {
      whatsappQueued = true;
      tasks.push(sendTwilioWhatsApp({ to: vendorPhone, body }));
    }
  }

  const vendorUserIds = [
    order.vendor.ownerId,
    ...order.vendor.members.map((member) => member.userId),
  ].filter((value): value is string => Boolean(value));
  if (vendorUserIds.length > 0) {
    const claimed = await claimOrderNotification(orderId, "paid-order", "push-vendor");
    if (claimed) {
      pushQueued = true;
      tasks.push(
        sendPushToUsers(vendorUserIds, "orderUpdatesEnabled", {
          title: "New paid order",
          body: `${orderRef} is paid and ready in your vendor dashboard.`,
          url: "/vendors/dashboard",
          tag: `lethela-order-${orderRef}`,
        }),
      );
    }
  }

  if (order.userId) {
    const claimed = await claimOrderNotification(orderId, "paid-order", "push-customer");
    if (claimed) {
      pushQueued = true;
      tasks.push(
        sendPushToUsers([order.userId], "orderUpdatesEnabled", {
          title: "Order paid",
          body: `${orderRef} has been paid. We will keep you posted as it moves.`,
          url: `/orders/${orderRef}`,
          tag: `lethela-order-${orderRef}`,
        }),
      );
    }
  }

  await Promise.allSettled(tasks);

  return {
    delivered: whatsappQueued || pushQueued,
    whatsappQueued,
    pushQueued,
  } as const;
}

export async function notifyOrderStatusPush(orderId: string, status: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      publicId: true,
      ozowReference: true,
      userId: true,
      vendor: {
        select: {
          ownerId: true,
          members: {
            select: { userId: true },
            take: 20,
          },
        },
      },
    },
  });
  if (!order) return { sent: 0, failed: 0, total: 0 };

  const orderRef = order.publicId || order.ozowReference || orderId;
  const label = status.replaceAll("_", " ").toLowerCase();
  const vendorUserIds = [
    order.vendor.ownerId,
    ...order.vendor.members.map((member) => member.userId),
  ].filter((value): value is string => Boolean(value));
  const customerUserIds = order.userId ? [order.userId] : [];

  const [vendorDelivery, customerDelivery] = await Promise.all([
    sendPushToUsers(vendorUserIds, "orderUpdatesEnabled", {
      title: "Order status updated",
      body: `${orderRef} is now ${label}.`,
      url: "/vendors/dashboard",
      tag: `lethela-order-${orderRef}`,
    }),
    sendPushToUsers(customerUserIds, "orderUpdatesEnabled", {
      title: "Order status updated",
      body: `${orderRef} is now ${label}.`,
      url: `/orders/${orderRef}`,
      tag: `lethela-order-${orderRef}`,
    }),
  ]);

  return {
    sent: vendorDelivery.sent + customerDelivery.sent,
    failed: vendorDelivery.failed + customerDelivery.failed,
    total: vendorDelivery.total + customerDelivery.total,
  };
}
