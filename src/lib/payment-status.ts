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

// Cash on delivery is switched off: since 23 Oct 2026 every order is placed and paid online
// (Ozow). Older cash orders still show and complete as before through isCashOnDelivery.
export function cashOnDeliverySettings() {
  return { enabled: false, maxCents: 0 };
}

export function onlinePaymentConfigured() {
  return Boolean(process.env.OZOW_SITE_CODE?.trim() && process.env.OZOW_PRIVATE_KEY?.trim());
}

export function isOnlinePaid(paymentStatus: string | null | undefined) {
  return ONLINE_PAID_STATUSES.includes(String(paymentStatus || "").toUpperCase());
}
