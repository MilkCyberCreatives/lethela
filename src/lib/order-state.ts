export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "NEW",
  "VENDOR_ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
  "CANCELLED",
  "REFUND_REQUESTED",
  "REFUNDED",
  "FAILED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED", "FAILED"],
  PAID: ["NEW", "REFUND_REQUESTED", "CANCELLED"],
  NEW: ["VENDOR_ACCEPTED", "CANCELLED", "REFUND_REQUESTED"],
  VENDOR_ACCEPTED: ["PREPARING", "CANCELLED", "REFUND_REQUESTED"],
  PREPARING: ["READY_FOR_PICKUP", "CANCELLED", "REFUND_REQUESTED"],
  READY_FOR_PICKUP: ["RIDER_ASSIGNED", "CANCELLED", "REFUND_REQUESTED"],
  RIDER_ASSIGNED: ["PICKED_UP", "READY_FOR_PICKUP", "CANCELLED"],
  PICKED_UP: ["ON_THE_WAY", "CANCELLED"],
  ON_THE_WAY: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["REFUND_REQUESTED"],
  CANCELLED: ["REFUND_REQUESTED", "REFUNDED"],
  REFUND_REQUESTED: ["REFUNDED", "DELIVERED", "CANCELLED"],
  REFUNDED: [],
  FAILED: [],
};

const LEGACY_STATUS: Record<string, OrderStatus> = {
  PLACED: "NEW",
  OUT_FOR_DELIVERY: "ON_THE_WAY",
  CANCELED: "CANCELLED",
};

export function normalizeOrderStatus(value: unknown): OrderStatus | null {
  const status = String(value || "")
    .trim()
    .toUpperCase();
  if (status in LEGACY_STATUS) return LEGACY_STATUS[status];
  return ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : null;
}

export function canTransitionOrderStatus(fromValue: unknown, toValue: unknown) {
  const from = normalizeOrderStatus(fromValue);
  const to = normalizeOrderStatus(toValue);
  if (!from || !to) return false;
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}
