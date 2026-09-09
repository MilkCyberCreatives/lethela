import { STAFF_ROLE_VALUES } from "@/lib/auth-roles";
import { prisma } from "@/lib/db";

export const NOTIFICATION_LIST_LIMIT = 30;

export type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
};

function normalize(input: Omit<NotificationInput, "userId">) {
  return {
    type: input.type.slice(0, 60),
    title: input.title.slice(0, 200),
    body: input.body ? input.body.slice(0, 1000) : null,
    href: input.href ? input.href.slice(0, 500) : null,
  };
}

export async function createNotification(input: NotificationInput) {
  return prisma.notification.create({
    data: { userId: input.userId, ...normalize(input) },
  });
}

export async function createNotificationForUsers(
  userIds: string[],
  input: Omit<NotificationInput, "userId">,
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return { count: 0 };
  const fields = normalize(input);
  return prisma.notification.createMany({
    data: unique.map((userId) => ({ userId, ...fields })),
  });
}

export async function staffUserIds() {
  const staff = await prisma.user.findMany({
    where: { role: { in: STAFF_ROLE_VALUES as unknown as string[] } },
    select: { id: true },
  });
  return staff.map((row) => row.id);
}

export async function notifyStaff(input: Omit<NotificationInput, "userId">) {
  const ids = await staffUserIds();
  return createNotificationForUsers(ids, input);
}

export async function listNotifications(userId: string, limit = NOTIFICATION_LIST_LIMIT) {
  const take = Math.min(
    Math.max(Math.trunc(limit) || NOTIFICATION_LIST_LIMIT, 1),
    NOTIFICATION_LIST_LIMIT,
  );
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        href: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, unreadCount };
}

export async function markNotificationsRead(userId: string, opts: { id?: string; all?: boolean }) {
  if (opts.all) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
  if (opts.id) {
    return prisma.notification.updateMany({
      where: { id: opts.id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
  return { count: 0 };
}
