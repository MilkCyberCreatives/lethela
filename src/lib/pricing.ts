// src/lib/pricing.ts
import { geocodeSuburb, haversineKm, type LatLng } from "@/lib/geo";

export const DEFAULT_DELIVERY_FEE_CENTS = 1000;
export const INCLUDED_DELIVERY_RADIUS_KM = 1;
export const EXTRA_DELIVERY_FEE_PER_KM_CENTS = 500;
export const MAX_LAUNCH_DELIVERY_DISTANCE_KM = 10;
export const DELIVERY_PRICING_WORDING =
  "Delivery starts from R10 for nearby orders. Final delivery fee is based on distance and is shown before you confirm.";

export const DELIVERY_FEE_TIERS = [
  { maxKm: 1, feeCents: 1000, label: "0-1 km" },
  { maxKm: 2, feeCents: 1500, label: "1.1-2 km" },
  { maxKm: 3, feeCents: 2000, label: "2.1-3 km" },
  { maxKm: 4, feeCents: 2500, label: "3.1-4 km" },
  { maxKm: 5, feeCents: 3000, label: "4.1-5 km" },
  { maxKm: 6, feeCents: 3500, label: "5.1-6 km" },
  { maxKm: 8, feeCents: 4500, label: "6.1-8 km" },
  { maxKm: 10, feeCents: 5500, label: "8.1-10 km" },
] as const;

type DeliveryVendorLocation = {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  suburb?: string | null;
  city?: string | null;
};

function normalizeBaseFeeCents(baseFeeCents?: number | null) {
  if (typeof baseFeeCents === "number" && Number.isFinite(baseFeeCents) && baseFeeCents >= 0) {
    return Math.round(baseFeeCents);
  }
  return DEFAULT_DELIVERY_FEE_CENTS;
}

function vendorAddressQuery(vendor: DeliveryVendorLocation) {
  return [vendor.address, vendor.suburb, vendor.city].filter(Boolean).join(", ");
}

async function resolveVendorPoint(vendor: DeliveryVendorLocation): Promise<LatLng | null> {
  if (typeof vendor.latitude === "number" && typeof vendor.longitude === "number") {
    return { lat: vendor.latitude, lng: vendor.longitude };
  }

  const query = vendorAddressQuery(vendor);
  if (!query) return null;
  return geocodeSuburb(query);
}

export function deliveryFeeCents(distanceKm?: number | null, baseFeeCents?: number | null): number {
  const normalizedBaseFeeCents = normalizeBaseFeeCents(baseFeeCents);
  if (!distanceKm) {
    return normalizedBaseFeeCents;
  }

  const tier = DELIVERY_FEE_TIERS.find((item) => distanceKm <= item.maxKm);
  return tier?.feeCents ?? DELIVERY_FEE_TIERS[DELIVERY_FEE_TIERS.length - 1].feeCents;
}

export function needsManualDeliveryQuote(distanceKm?: number | null): boolean {
  return typeof distanceKm === "number" && distanceKm > MAX_LAUNCH_DELIVERY_DISTANCE_KM;
}

export function deliveryFeeZAR(distanceKm?: number | null, baseFeeCents?: number | null): number {
  return deliveryFeeCents(distanceKm, baseFeeCents) / 100;
}

export async function quoteDelivery({
  vendor,
  destinationSuburb,
  destinationPoint: explicitDestinationPoint,
  baseFeeCents,
}: {
  vendor: DeliveryVendorLocation;
  destinationSuburb?: string | null;
  destinationPoint?: LatLng | null;
  baseFeeCents?: number | null;
}) {
  const normalizedBaseFeeCents = normalizeBaseFeeCents(baseFeeCents);
  const destinationQuery = destinationSuburb?.trim() || "";
  const [originPoint, destinationPoint] = await Promise.all([
    resolveVendorPoint(vendor),
    explicitDestinationPoint
      ? Promise.resolve(explicitDestinationPoint)
      : destinationQuery
        ? geocodeSuburb(destinationQuery)
        : Promise.resolve(null),
  ]);

  const distanceKm =
    originPoint && destinationPoint
      ? Number(
          haversineKm(
            originPoint.lat,
            originPoint.lng,
            destinationPoint.lat,
            destinationPoint.lng,
          ).toFixed(2),
        )
      : null;

  return {
    originResolved: Boolean(originPoint),
    destinationResolved: Boolean(destinationPoint),
    locationResolved: Boolean(originPoint && destinationPoint),
    baseFeeCents: normalizedBaseFeeCents,
    deliveryCents: deliveryFeeCents(distanceKm, normalizedBaseFeeCents),
    distanceKm,
    manualQuoteRequired: needsManualDeliveryQuote(distanceKm),
    maxLaunchDistanceKm: MAX_LAUNCH_DELIVERY_DISTANCE_KM,
    includedRadiusKm: INCLUDED_DELIVERY_RADIUS_KM,
    extraPerKmCents: EXTRA_DELIVERY_FEE_PER_KM_CENTS,
  };
}

export function etaMinutes(distanceKm?: number | null, baseKitchenMin = 15) {
  const dist = distanceKm ?? 3;
  const travel = Math.round(dist * 4.5);
  const hour = new Date().getHours();
  const rush = hour >= 18 && hour <= 20 ? 1.25 : hour >= 12 && hour <= 13 ? 1.15 : 1;
  return Math.max(12, Math.round((baseKitchenMin + travel) * rush));
}
