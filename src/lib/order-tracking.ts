export type TrackingOrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PREPARING"
  | "PICKED_UP"
  | "ON_THE_WAY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type TrackingPoint = { lat: number; lng: number };

type TrackingShape = {
  status: string;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  riderLocatedAt?: string | Date | null;
  vendor?: TrackingPoint | null;
  destination?: TrackingPoint | null;
  rider?: TrackingPoint | null;
};

const STATUS_PROGRESS: Record<TrackingOrderStatus, number> = {
  PENDING: 12,
  ACCEPTED: 26,
  PREPARING: 42,
  PICKED_UP: 64,
  ON_THE_WAY: 78,
  OUT_FOR_DELIVERY: 78,
  DELIVERED: 100,
  CANCELLED: 100,
};

const STATUS_ETA: Record<TrackingOrderStatus, string> = {
  PENDING: "35-45 min",
  ACCEPTED: "30-40 min",
  PREPARING: "20-30 min",
  PICKED_UP: "12-20 min",
  ON_THE_WAY: "8-15 min",
  OUT_FOR_DELIVERY: "8-15 min",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUS_LABEL: Record<TrackingOrderStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  PREPARING: "Kitchen is preparing your order",
  PICKED_UP: "Picked up",
  ON_THE_WAY: "On the way",
  OUT_FOR_DELIVERY: "Rider is on the way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUS_DETAIL: Record<TrackingOrderStatus, string> = {
  PENDING: "Your order is waiting for confirmation or payment completion.",
  ACCEPTED: "The vendor accepted your order and will start preparing it.",
  PREPARING: "The vendor is preparing your items for handoff.",
  PICKED_UP: "The rider has collected your order from the vendor.",
  ON_THE_WAY: "Your rider is heading to your drop-off point now.",
  OUT_FOR_DELIVERY: "Your rider is heading to your drop-off point now.",
  DELIVERED: "The order has been marked as delivered.",
  CANCELLED: "This order was cancelled before completion.",
};

export function normalizeTrackingStatus(input: string | null | undefined): TrackingOrderStatus {
  const upper = String(input || "")
    .trim()
    .toUpperCase();
  if (upper === "PLACED") return "PENDING";
  if (upper === "CANCELED") return "CANCELLED";
  if (
    upper === "PENDING" ||
    upper === "ACCEPTED" ||
    upper === "PREPARING" ||
    upper === "PICKED_UP" ||
    upper === "ON_THE_WAY" ||
    upper === "OUT_FOR_DELIVERY" ||
    upper === "DELIVERED" ||
    upper === "CANCELLED"
  ) {
    return upper;
  }
  return "PENDING";
}

export function isTerminalTrackingStatus(status: string | null | undefined) {
  const normalized = normalizeTrackingStatus(status);
  return normalized === "DELIVERED" || normalized === "CANCELLED";
}

export function getTrackingStatusLabel(status: string | null | undefined) {
  return STATUS_LABEL[normalizeTrackingStatus(status)];
}

export function getTrackingStatusDetail(status: string | null | undefined) {
  return STATUS_DETAIL[normalizeTrackingStatus(status)];
}

export function getTrackingEta(status: string | null | undefined) {
  return STATUS_ETA[normalizeTrackingStatus(status)];
}

export function getTrackingProgress(status: string | null | undefined) {
  return STATUS_PROGRESS[normalizeTrackingStatus(status)];
}

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function interpolatePoint(start: TrackingPoint, end: TrackingPoint, t: number): TrackingPoint {
  return {
    lat: start.lat + (end.lat - start.lat) * t,
    lng: start.lng + (end.lng - start.lng) * t,
  };
}

export function getSimulatedRiderPoint(order: TrackingShape): TrackingPoint | null {
  const status = normalizeTrackingStatus(order.status);
  const vendor = order.vendor;
  const destination = order.destination;
  if (!vendor || !destination || (status !== "OUT_FOR_DELIVERY" && status !== "ON_THE_WAY"))
    return null;

  const anchor = toDate(order.riderLocatedAt) || toDate(order.updatedAt) || toDate(order.createdAt);
  if (!anchor) return interpolatePoint(vendor, destination, 0.25);

  const elapsedMs = Date.now() - anchor.getTime();
  const t = Math.min(0.96, Math.max(0.08, elapsedMs / (22 * 60 * 1000)));
  return interpolatePoint(vendor, destination, t);
}

export function buildTrackingSnapshot(order: TrackingShape) {
  const status = normalizeTrackingStatus(order.status);
  const rider = order.rider ?? getSimulatedRiderPoint(order);
  const baseProgress = getTrackingProgress(status);
  let liveProgress = baseProgress;

  if (
    (status === "OUT_FOR_DELIVERY" || status === "ON_THE_WAY") &&
    order.vendor &&
    order.destination &&
    rider
  ) {
    const totalLat = order.destination.lat - order.vendor.lat;
    const totalLng = order.destination.lng - order.vendor.lng;
    const travelledLat = rider.lat - order.vendor.lat;
    const travelledLng = rider.lng - order.vendor.lng;

    const latRatio = Math.abs(totalLat) > 0.00001 ? travelledLat / totalLat : 0;
    const lngRatio = Math.abs(totalLng) > 0.00001 ? travelledLng / totalLng : 0;
    const routeRatio = [latRatio, lngRatio].filter((value) => Number.isFinite(value));
    const ratio =
      routeRatio.length > 0
        ? routeRatio.reduce((sum, value) => sum + value, 0) / routeRatio.length
        : 0;
    liveProgress = Math.max(baseProgress, Math.min(96, 62 + Math.max(0, ratio) * 34));
  }

  return {
    status,
    statusLabel: getTrackingStatusLabel(status),
    statusDetail: getTrackingStatusDetail(status),
    etaLabel: getTrackingEta(status),
    progressPct: Math.round(liveProgress),
    rider,
    hasLiveRider: Boolean(order.rider),
  };
}
