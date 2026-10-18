import { prisma } from "@/lib/db";
import { riderDropoff } from "@/lib/order-notifications";
import { getOrderRealtimeChannel } from "@/lib/order-tracking-access";
import { CONFIRMED_PAYMENT_STATUSES } from "@/lib/payment-status";
import { pusherServer } from "@/lib/pusher-server";
import { listFreshRiderLocations } from "@/lib/rider-offers";

// Riders' phones share where they are while they are online or on a delivery.
// While a rider has a delivery, that position is copied onto the order so the
// customer can follow them, and admins see every rider on the live map.

/** A rider on one of these orders is on the road for it. */
export const RIDER_ON_DELIVERY_STATUSES = ["RIDER_ASSIGNED", "PICKED_UP", "ON_THE_WAY"];
/** Orders shown on the admin live map. */
const LIVE_ORDER_STATUSES = ["READY_FOR_PICKUP", ...RIDER_ON_DELIVERY_STATUSES];
/** Older open orders are left off the live map; the Orders view still has them. */
const LIVE_ORDER_WINDOW_MS = 12 * 60 * 60 * 1000;

export async function riderActiveDeliveryCount(riderId: string) {
  return prisma.order.count({
    where: { assignedRiderId: riderId, status: { in: RIDER_ON_DELIVERY_STATUSES } },
  });
}

/**
 * Copies the rider's position onto every order they are delivering and tells
 * the customer's tracking page. Returns how many orders were updated.
 */
export async function shareRiderLocationWithDeliveries(
  riderId: string,
  point: { lat: number; lng: number; speed?: number | null },
) {
  const orders = await prisma.order.findMany({
    where: { assignedRiderId: riderId, status: { in: RIDER_ON_DELIVERY_STATUSES } },
    select: { id: true, publicId: true, ozowReference: true },
  });
  if (orders.length === 0) return 0;
  const at = new Date();
  await prisma.order.updateMany({
    where: { id: { in: orders.map((order) => order.id) } },
    data: {
      riderLat: point.lat,
      riderLng: point.lng,
      riderSpeed: point.speed ?? null,
      riderLocatedAt: at,
    },
  });
  await Promise.all(
    orders.map(async (order) => {
      try {
        await pusherServer.trigger(
          getOrderRealtimeChannel(order.ozowReference || order.publicId),
          "location",
          { lat: point.lat, lng: point.lng, speed: point.speed ?? undefined, at: at.toISOString() },
        );
      } catch {
        // realtime may be off; the tracking page also refreshes on its own
      }
    }),
  );
  return orders.length;
}

type Point = { lat: number; lng: number };

function point(lat: number | null | undefined, lng: number | null | undefined): Point | null {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
    ? { lat, lng }
    : null;
}

/** Everything the admin live map shows: riders out now and open deliveries. */
export async function liveTrackingSnapshot() {
  const [locations, deliveries] = await Promise.all([
    listFreshRiderLocations().catch(() => []),
    prisma.order.findMany({
      where: {
        status: { in: LIVE_ORDER_STATUSES },
        paymentStatus: { in: CONFIRMED_PAYMENT_STATUSES },
        updatedAt: { gte: new Date(Date.now() - LIVE_ORDER_WINDOW_MS) },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        publicId: true,
        ozowReference: true,
        status: true,
        itemsJson: true,
        customerLat: true,
        customerLng: true,
        riderLat: true,
        riderLng: true,
        riderSpeed: true,
        riderLocatedAt: true,
        assignedRiderId: true,
        createdAt: true,
        updatedAt: true,
        vendor: { select: { name: true, suburb: true, latitude: true, longitude: true } },
      },
    }),
  ]);

  const locationByRider = new Map(locations.map((row) => [row.riderId, row] as const));
  const riderIds = new Set<string>([
    ...locations.map((row) => row.riderId),
    ...deliveries.map((order) => order.assignedRiderId).filter((id): id is string => Boolean(id)),
  ]);
  const riders = await prisma.riderApplication.findMany({
    where: {
      OR: [{ id: { in: [...riderIds] } }, { status: "APPROVED", availableNow: true }],
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      vehicleType: true,
      suburb: true,
      city: true,
      availableNow: true,
    },
  });

  const deliveryRows = deliveries.map((order) => {
    const riderPoint = point(order.riderLat, order.riderLng);
    const dropoff = riderDropoff(order.itemsJson);
    return {
      ref: order.ozowReference || order.publicId,
      status: order.status,
      vendor: order.vendor?.name || "Store",
      vendorArea: order.vendor?.suburb || null,
      vendorPoint: point(order.vendor?.latitude, order.vendor?.longitude),
      destination: point(order.customerLat, order.customerLng),
      customerName: dropoff.customerName || null,
      dropoffAddress: dropoff.address || null,
      riderId: order.assignedRiderId,
      riderPoint,
      riderSpeed: order.riderSpeed,
      riderLocatedAt: riderPoint ? (order.riderLocatedAt?.toISOString() ?? null) : null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  });

  const riderRows = riders
    .map((rider) => {
      const own = locationByRider.get(rider.id);
      const delivery = deliveryRows.find(
        (row) => row.riderId === rider.id && RIDER_ON_DELIVERY_STATUSES.includes(row.status),
      );
      // The newest of the online position and the delivery position wins.
      const fromDelivery =
        delivery?.riderPoint && delivery.riderLocatedAt
          ? { ...delivery.riderPoint, locatedAt: delivery.riderLocatedAt }
          : null;
      const fromOnline = own ? { lat: own.lat, lng: own.lng, locatedAt: own.locatedAt } : null;
      const latestPoint =
        fromDelivery && fromOnline
          ? Date.parse(fromDelivery.locatedAt) >= Date.parse(fromOnline.locatedAt)
            ? fromDelivery
            : fromOnline
          : fromDelivery || fromOnline;
      return {
        id: rider.id,
        name: rider.fullName || "Rider",
        phone: rider.phone || null,
        vehicle: rider.vehicleType || null,
        area: [rider.suburb, rider.city].filter(Boolean).join(", ") || null,
        online: rider.availableNow,
        onDelivery: delivery ? { ref: delivery.ref, status: delivery.status } : null,
        location: latestPoint,
      };
    })
    .filter((rider) => rider.online || rider.onDelivery)
    .sort((left, right) => {
      if (Boolean(left.onDelivery) !== Boolean(right.onDelivery)) return left.onDelivery ? -1 : 1;
      return left.name.localeCompare(right.name);
    });

  const riderNames = new Map(riders.map((rider) => [rider.id, rider] as const));
  return {
    generatedAt: new Date().toISOString(),
    riders: riderRows,
    deliveries: deliveryRows.map((row) => {
      const rider = row.riderId ? riderNames.get(row.riderId) : null;
      return {
        ...row,
        riderName: rider?.fullName || null,
        riderPhone: rider?.phone || null,
      };
    }),
  };
}

export type LiveTrackingSnapshot = Awaited<ReturnType<typeof liveTrackingSnapshot>>;
