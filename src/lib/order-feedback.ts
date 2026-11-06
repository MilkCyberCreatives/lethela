import { prisma } from "@/lib/db";
import {
  ORDER_FEEDBACK_TYPE,
  orderFeedbackId,
  parseOrderFeedback,
  summarizeRatings,
  type OrderFeedback,
} from "@/lib/order-feedback-core";

export * from "@/lib/order-feedback-core";

// Database reads for order ratings. Pure helpers live in order-feedback-core.ts so the
// browser can use them without pulling in the database client.
export async function getOrderFeedback(orderPublicId: string) {
  const row = await prisma.platformMessage
    .findUnique({ where: { id: orderFeedbackId(orderPublicId) }, select: { body: true } })
    .catch(() => null);
  return row ? parseOrderFeedback(row.body) : null;
}

export async function listStoreFeedback(vendorId: string, take = 200) {
  const rows = await prisma.platformMessage
    .findMany({
      where: { recipientType: ORDER_FEEDBACK_TYPE, recipientId: vendorId },
      orderBy: { createdAt: "desc" },
      take: Math.min(500, Math.max(1, take)),
      select: { body: true, createdAt: true },
    })
    .catch(() => []);
  return rows
    .map((row) => {
      const feedback = parseOrderFeedback(row.body);
      return feedback ? { ...feedback, createdAt: row.createdAt.toISOString() } : null;
    })
    .filter((item): item is OrderFeedback & { createdAt: string } => Boolean(item));
}

export async function getStoreRatingSummary(vendorId: string) {
  const feedback = await listStoreFeedback(vendorId);
  return {
    ...summarizeRatings(feedback.map((item) => item.storeRating)),
    recent: feedback.slice(0, 10),
  };
}

export async function getRiderRatingSummary(riderId: string) {
  const rows = await prisma.platformMessage
    .findMany({
      where: { recipientType: ORDER_FEEDBACK_TYPE, body: { contains: riderId } },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { body: true },
    })
    .catch(() => []);
  const ratings = rows
    .map((row) => parseOrderFeedback(row.body))
    .filter((item) => item?.riderId === riderId && item.riderRating != null)
    .map((item) => item!.riderRating!);
  return summarizeRatings(ratings);
}
