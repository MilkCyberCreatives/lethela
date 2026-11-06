// Customers rate a delivered order once: the store (1-5), the rider (1-5, when a rider
// delivered it) and an optional comment. Ratings are kept as PlatformMessage rows so no
// database change is needed: recipientType ORDER_FEEDBACK, recipientId = the store's id,
// and the row id is fixed per order so an order can only be rated once.
export const ORDER_FEEDBACK_TYPE = "ORDER_FEEDBACK";
export const LOW_RATING = 2;

export type OrderFeedback = {
  orderRef: string;
  storeRating: number;
  riderRating: number | null;
  riderId: string | null;
  comment: string;
  customerName: string;
  submittedAt: string;
};

export function orderFeedbackId(orderPublicId: string) {
  return `order-feedback-${String(orderPublicId || "")
    .trim()
    .toUpperCase()}`;
}

export function canRateOrderStatus(status: string | null | undefined) {
  return String(status || "").toUpperCase() === "DELIVERED";
}

function clampRating(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const rounded = Math.round(number);
  return rounded >= 1 && rounded <= 5 ? rounded : null;
}

export function firstName(name: string | null | undefined) {
  const first = String(name || "")
    .trim()
    .split(/\s+/)[0];
  return first ? first.slice(0, 40) : "Customer";
}

export function parseOrderFeedback(body: string | null | undefined): OrderFeedback | null {
  try {
    const value = JSON.parse(String(body || ""));
    if (!value || typeof value !== "object") return null;
    const storeRating = clampRating(value.storeRating);
    if (storeRating == null) return null;
    return {
      orderRef: String(value.orderRef || ""),
      storeRating,
      riderRating: clampRating(value.riderRating),
      riderId: value.riderId ? String(value.riderId) : null,
      comment: String(value.comment || "")
        .trim()
        .slice(0, 500),
      customerName: firstName(value.customerName),
      submittedAt: String(value.submittedAt || ""),
    };
  } catch {
    return null;
  }
}

export function summarizeRatings(ratings: number[]) {
  const valid = ratings.filter((rating) => rating >= 1 && rating <= 5);
  if (valid.length === 0) return { average: null as number | null, count: 0 };
  const total = valid.reduce((sum, rating) => sum + rating, 0);
  return { average: Number((total / valid.length).toFixed(1)), count: valid.length };
}

// Joins two averages (for example product reviews and order ratings) by their counts.
export function combineAverages(
  a: { average: number | null; count: number },
  b: { average: number | null; count: number },
) {
  const count = a.count + b.count;
  if (count === 0) return { average: null as number | null, count: 0 };
  const total = (a.average ?? 0) * a.count + (b.average ?? 0) * b.count;
  return { average: Number((total / count).toFixed(1)), count };
}
