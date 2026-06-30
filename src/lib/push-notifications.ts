import { prisma } from "@/server/db";
import { hasWebPushConfig, sendPushToSubscription } from "@/lib/web-push";

type PushPreferenceKey =
  | "marketingEnabled"
  | "orderUpdatesEnabled"
  | "recommendationsEnabled"
  | "adminAlertsEnabled";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type PushTarget = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function deliver(subscriptions: PushTarget[], payload: PushPayload) {
  if (!hasWebPushConfig() || subscriptions.length === 0) {
    return { sent: 0, failed: 0, total: subscriptions.length };
  }

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await sendPushToSubscription(subscription, payload);
        sent += 1;
      } catch (error: unknown) {
        failed += 1;
        const statusCode =
          typeof error === "object" &&
          error &&
          "statusCode" in error &&
          typeof (error as { statusCode?: unknown }).statusCode === "number"
            ? (error as { statusCode: number }).statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({
            where: { endpoint: subscription.endpoint },
          });
        }
      }
    }),
  );

  return { sent, failed, total: subscriptions.length };
}

function preferenceWhere(preference: PushPreferenceKey) {
  return {
    visitor: {
      pushPreferences: {
        some: {
          [preference]: true,
        },
      },
    },
  };
}

export async function sendPushToUsers(
  userIds: string[],
  preference: PushPreferenceKey,
  payload: PushPayload,
) {
  const uniqueUserIds = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueUserIds.length === 0) return { sent: 0, failed: 0, total: 0 };

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId: { in: uniqueUserIds },
      ...preferenceWhere(preference),
    },
    select: { endpoint: true, p256dh: true, auth: true },
    take: 500,
  });

  return deliver(subscriptions, payload);
}

export async function sendPushToAdmins(payload: PushPayload) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
    take: 100,
  });
  const adminUserIds = admins.map((admin) => admin.id);
  if (adminUserIds.length === 0) return { sent: 0, failed: 0, total: 0 };

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId: { in: adminUserIds },
      ...preferenceWhere("adminAlertsEnabled"),
    },
    select: { endpoint: true, p256dh: true, auth: true },
    take: 200,
  });

  return deliver(subscriptions, payload);
}

export async function sendPushToMarketingSubscribers(payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: preferenceWhere("marketingEnabled"),
    select: { endpoint: true, p256dh: true, auth: true },
    take: 500,
  });

  return deliver(subscriptions, payload);
}

export async function sendPushToSelectedMarketingVisitors(
  visitorIds: string[],
  payload: PushPayload,
) {
  const uniqueVisitorIds = [...new Set(visitorIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueVisitorIds.length === 0) return { sent: 0, failed: 0, total: 0 };

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      visitorId: { in: uniqueVisitorIds },
      ...preferenceWhere("marketingEnabled"),
    },
    select: { endpoint: true, p256dh: true, auth: true },
    take: 500,
  });

  return deliver(subscriptions, payload);
}
