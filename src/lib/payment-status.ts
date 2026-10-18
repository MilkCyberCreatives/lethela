// Payment states that let an order go ahead (store prepares it, riders are offered it).
// "CASH" is cash on delivery: the order is confirmed, and the rider collects the money at
// the door. Ozow reports a completed payment as "PAID" (older rows may say "SUCCESS").
export const CASH_PAYMENT_STATUS = "CASH";
export const ONLINE_PAID_STATUSES = ["PAID", "SUCCESS"];
export const CONFIRMED_PAYMENT_STATUSES = [...ONLINE_PAID_STATUSES, CASH_PAYMENT_STATUS];

export function isConfirmedPayment(paymentStatus: string | null | undefined) {
  return CONFIRMED_PAYMENT_STATUSES.includes(String(paymentStatus || "").toUpperCase());
}

export function isCashOnDelivery(paymentStatus: string | null | undefined) {
  return String(paymentStatus || "").toUpperCase() === CASH_PAYMENT_STATUS;
}

// Cash on delivery is on unless CASH_ON_DELIVERY_ENABLED=false. Orders above the limit must
// be paid online, so a rider never carries a large amount (CASH_ON_DELIVERY_MAX_CENTS,
// default R600).
export function cashOnDeliverySettings() {
  const enabled = process.env.CASH_ON_DELIVERY_ENABLED?.trim().toLowerCase() !== "false";
  const configuredMax = Number(process.env.CASH_ON_DELIVERY_MAX_CENTS);
  const maxCents =
    Number.isFinite(configuredMax) && configuredMax > 0 ? Math.floor(configuredMax) : 60_000;
  return { enabled, maxCents };
}

export function onlinePaymentConfigured() {
  return Boolean(process.env.OZOW_SITE_CODE?.trim() && process.env.OZOW_PRIVATE_KEY?.trim());
}

export function isOnlinePaid(paymentStatus: string | null | undefined) {
  return ONLINE_PAID_STATUSES.includes(String(paymentStatus || "").toUpperCase());
}
