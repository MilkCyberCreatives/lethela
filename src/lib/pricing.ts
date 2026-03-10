// src/lib/pricing.ts
/**
 * Delivery fee (ZAR):
 * - If distance < 1 km: R10  ✅ (your rule)
 * - Else: R10 + R7 per started km beyond the first (ceil)
 */
export function deliveryFeeZAR(distanceKm?: number | null): number {
  if (!distanceKm || distanceKm <= 0) return 10;
  if (distanceKm < 1) return 10;
  const extraKm = Math.ceil(distanceKm - 1);
  return 10 + 7 * extraKm;
}

export function etaMinutes(distanceKm?: number | null, baseKitchenMin = 15) {
  const dist = distanceKm ?? 3;
  const travel = Math.round(dist * 4.5);
  const hour = new Date().getHours();
  const rush = (hour >= 18 && hour <= 20) ? 1.25 : (hour >= 12 && hour <= 13) ? 1.15 : 1;
  return Math.max(12, Math.round((baseKitchenMin + travel) * rush));
}
