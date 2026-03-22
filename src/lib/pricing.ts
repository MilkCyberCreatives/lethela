// src/lib/pricing.ts
import { geocodeSuburb, haversineKm, type LatLng } from "@/lib/geo";

export const DEFAULT_DELIVERY_FEE_CENTS = 1000;
export const INCLUDED_DELIVERY_RADIUS_KM = 1;
export const EXTRA_DELIVERY_FEE_PER_KM_CENTS = 700;

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
  if (!distanceKm || distanceKm <= INCLUDED_DELIVERY_RADIUS_KM) {
    return normalizedBaseFeeCents;
  }

  const extraKm = Math.ceil(distanceKm - INCLUDED_DELIVERY_RADIUS_KM);
  return normalizedBaseFeeCents + extraKm * EXTRA_DELIVERY_FEE_PER_KM_CENTS;
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
      ? Number(haversineKm(originPoint.lat, originPoint.lng, destinationPoint.lat, destinationPoint.lng).toFixed(2))
      : null;

  return {
    originResolved: Boolean(originPoint),
    destinationResolved: Boolean(destinationPoint),
    locationResolved: Boolean(originPoint && destinationPoint),
    baseFeeCents: normalizedBaseFeeCents,
    deliveryCents: deliveryFeeCents(distanceKm, normalizedBaseFeeCents),
    distanceKm,
    includedRadiusKm: INCLUDED_DELIVERY_RADIUS_KM,
    extraPerKmCents: EXTRA_DELIVERY_FEE_PER_KM_CENTS,
  };
}

export function etaMinutes(distanceKm?: number | null, baseKitchenMin = 15) {
  const dist = distanceKm ?? 3;
  const travel = Math.round(dist * 4.5);
  const hour = new Date().getHours();
  const rush = (hour >= 18 && hour <= 20) ? 1.25 : hour >= 12 && hour <= 13 ? 1.15 : 1;
  return Math.max(12, Math.round((baseKitchenMin + travel) * rush));
}
