import crypto from "node:crypto";
import { prisma, prismaRuntimeInfo } from "@/lib/db";
import { haversineKm } from "@/lib/geo";
import {
  createDispatchAssignment,
  ensureOrderOperationsTables,
  recordOrderEvent,
} from "@/lib/order-operations";
import {
  claimOrderNotification,
  notifyOrderStatusPush,
  notifyRiderOfAssignment,
  notifyRiderOfOffer,
} from "@/lib/order-notifications";
import { settleWithin } from "@/lib/notification-channels";
import { pusherServer } from "@/lib/pusher-server";
import { CONFIRMED_PAYMENT_STATUSES, isCashOnDelivery } from "@/lib/payment-status";

// A ready order is offered to the free riders closest to the store at the same
// time, and the first one to tap Accept gets it. If nobody accepts, the offer
// widens to every free rider who is online (see runOrderSweep).

const PAID_STATUSES = CONFIRMED_PAYMENT_STATUSES;
const RIDER_BUSY_STATUSES = ["RIDER_ASSIGNED", "PICKED_UP", "ON_THE_WAY"];
const MINUTE = 60 * 1000;

/** A rider's shared location counts for this long after their phone last sent it. */
export const LOCATION_FRESH_MS = 15 * MINUTE;
/** Riders this close to the store (or in its suburb or zones) hear first. */
export const NEARBY_KM = 3;
/** Riders further away than this are never offered the order. */
export const MAX_OFFER_KM = 15;
/** At most this many nearby riders are alerted first. */
export const FIRST_WAVE_SIZE = 5;
/** When nobody nearby accepts within this time, every free rider online hears. */
export const WIDEN_AFTER_MS = 2 * MINUTE;
/** When nobody at all accepts within this time, the admins are told. */
export const NO_ACCEPT_ALERT_AFTER_MS = 6 * MINUTE;

function marker(index: number) {
  return prismaRuntimeInfo.provider === "postgresql" ? `$${index}` : "?";
}

function markers(from: number, count: number) {
  return Array.from({ length: count }, (_, index) => marker(from + index)).join(", ");
}

function lower(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function parseZones(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map(lower).filter(Boolean) : [];
  } catch {
    return [];
  }
}

let tablesReady: Promise<void> | null = null;

export function ensureRiderOfferTables() {
  tablesReady ??= (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS app_rider_locations (
        rider_id TEXT PRIMARY KEY,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        located_at TEXT NOT NULL
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS app_dispatch_offers (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        rider_id TEXT NOT NULL,
        wave INTEGER NOT NULL,
        status TEXT NOT NULL,
        distance_km DOUBLE PRECISION,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS app_dispatch_offers_order_rider ON app_dispatch_offers (order_id, rider_id)`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS app_dispatch_offers_rider_status ON app_dispatch_offers (rider_id, status)`,
    );
  })();
  return tablesReady;
}

/** Keeps only the rider's latest position, and only while they are online. */
export async function saveRiderLocation(riderId: string, lat: number, lng: number) {
  await ensureRiderOfferTables();
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_rider_locations (rider_id, lat, lng, located_at) VALUES (${markers(1, 4)})
     ON CONFLICT (rider_id) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, located_at = excluded.located_at`,
    riderId,
    lat,
    lng,
    new Date().toISOString(),
  );
}

export async function clearRiderLocation(riderId: string) {
  await ensureRiderOfferTables();
  await prisma.$executeRawUnsafe(
    `DELETE FROM app_rider_locations WHERE rider_id = ${marker(1)}`,
    riderId,
  );
}

async function freshLocations(riderIds: string[]) {
  if (riderIds.length === 0) return new Map<string, { lat: number; lng: number }>();
  await ensureRiderOfferTables();
  const rows = await prisma.$queryRawUnsafe<
    Array<{ rider_id: string; lat: number; lng: number; located_at: string }>
  >(
    `SELECT rider_id, lat, lng, located_at FROM app_rider_locations
     WHERE rider_id IN (${markers(1, riderIds.length)}) AND located_at >= ${marker(riderIds.length + 1)}`,
    ...riderIds,
    new Date(Date.now() - LOCATION_FRESH_MS).toISOString(),
  );
  return new Map(
    rows.map((row) => [row.rider_id, { lat: Number(row.lat), lng: Number(row.lng) }] as const),
  );
}

export type RiderCandidate = {
  id: string;
  suburb: string;
  city: string;
  township: string;
  preferredZones: string;
  distanceKm: number | null;
};

type StoreArea = {
  suburb: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

/** True when the rider is close enough to the store to hear about the order first. */
export function isNearby(rider: RiderCandidate, store: StoreArea) {
  if (rider.distanceKm !== null) return rider.distanceKm <= NEARBY_KM;
  const suburb = lower(store.suburb);
  const local = [lower(rider.suburb), lower(rider.township), ...parseZones(rider.preferredZones)];
  return Boolean(suburb && local.includes(suburb));
}

/**
 * Orders free riders closest first: riders whose phone shows them near the store
 * by distance, then riders whose saved suburb or zones match the store, then the
 * store's city, then the rest. Among equals, whoever has had fewer deliveries today.
 */
export function rankRiders(
  riders: RiderCandidate[],
  store: StoreArea,
  deliveriesToday: Map<string, number>,
) {
  const city = lower(store.city);
  const tier = (rider: RiderCandidate) => {
    if (rider.distanceKm !== null && rider.distanceKm <= NEARBY_KM) return 0;
    if (isNearby(rider, store)) return 1;
    if (city && lower(rider.city) === city) return 2;
    return 3;
  };
  return [...riders].sort(
    (a, b) =>
      tier(a) - tier(b) ||
      (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE) ||
      (deliveriesToday.get(a.id) || 0) - (deliveriesToday.get(b.id) || 0) ||
      a.id.localeCompare(b.id),
  );
}

async function ridersWhoDeclined(orderId: string) {
  await ensureOrderOperationsTables();
  const rows = await prisma.$queryRawUnsafe<Array<{ actor: string | null }>>(
    `SELECT actor FROM app_order_events WHERE order_id = ${marker(1)} AND type = 'RIDER_ASSIGNMENT_DECLINED'`,
    orderId,
  );
  return new Set(
    rows
      .map((row) => String(row.actor || ""))
      .filter((actor) => actor.startsWith("rider:"))
      .map((actor) => actor.slice("rider:".length)),
  );
}

async function busyRiderIds() {
  const busy = await prisma.order.findMany({
    where: { status: { in: RIDER_BUSY_STATUSES }, assignedRiderId: { not: null } },
    select: { assignedRiderId: true },
  });
  return new Set(busy.map((order) => String(order.assignedRiderId)));
}

/** Approved, online riders who are free, have not turned this order down and are not too far. */
export async function candidateRiders(orderId: string, store: StoreArea) {
  const [riders, busy, declined] = await Promise.all([
    prisma.riderApplication.findMany({
      where: { status: "APPROVED", availableNow: true },
      select: { id: true, suburb: true, city: true, township: true, preferredZones: true },
      take: 200,
    }),
    busyRiderIds(),
    ridersWhoDeclined(orderId),
  ]);
  const free = riders.filter((rider) => !busy.has(rider.id) && !declined.has(rider.id));
  if (free.length === 0) return [];

  const locations = await freshLocations(free.map((rider) => rider.id));
  const storeHasPoint = typeof store.latitude === "number" && typeof store.longitude === "number";
  const withDistance: RiderCandidate[] = free
    .map((rider) => {
      const point = locations.get(rider.id);
      const distanceKm =
        point && storeHasPoint
          ? Math.round(
              haversineKm(point.lat, point.lng, Number(store.latitude), Number(store.longitude)) *
                10,
            ) / 10
          : null;
      return { ...rider, distanceKm };
    })
    .filter((rider) => rider.distanceKm === null || rider.distanceKm <= MAX_OFFER_KM);

  const since = new Date(Date.now() - 24 * 60 * MINUTE);
  const recent = await prisma.order.groupBy({
    by: ["assignedRiderId"],
    where: {
      assignedRiderId: { in: withDistance.map((rider) => rider.id) },
      createdAt: { gte: since },
    },
    _count: { _all: true },
  });
  const deliveriesToday = new Map(
    recent.map((row) => [String(row.assignedRiderId), row._count._all] as const),
  );
  return rankRiders(withDistance, store, deliveriesToday);
}

type OfferRow = {
  id: string;
  rider_id: string;
  wave: number;
  status: string;
  created_at: string;
};

async function offersFor(orderId: string) {
  await ensureRiderOfferTables();
  return prisma.$queryRawUnsafe<OfferRow[]>(
    `SELECT id, rider_id, wave, status, created_at FROM app_dispatch_offers WHERE order_id = ${marker(1)}`,
    orderId,
  );
}

/** Starts a fresh round of offers when an order comes back (a rider declined it). */
export async function resetOpenOffers(orderId: string) {
  await ensureRiderOfferTables();
  await prisma.$executeRawUnsafe(
    `DELETE FROM app_dispatch_offers WHERE order_id = ${marker(1)} AND status IN ('OFFERED', 'TAKEN')`,
    orderId,
  );
}

/** Closes every open offer on an order, for example when an admin assigns a rider. */
export async function closeOpenOffers(orderId: string, exceptRiderId?: string) {
  await ensureRiderOfferTables();
  await prisma.$executeRawUnsafe(
    `UPDATE app_dispatch_offers SET status = 'TAKEN', updated_at = ${marker(1)}
     WHERE order_id = ${marker(2)} AND status = 'OFFERED' AND rider_id <> ${marker(3)}`,
    new Date().toISOString(),
    orderId,
    exceptRiderId || "",
  );
}

export type OfferRound = {
  /** Riders alerted by this call. */
  alerted: number;
  /** Offers still waiting for an answer, including earlier ones. */
  open: number;
  wave: number;
  firstOfferedAt: string | null;
};

/**
 * Alerts free riders about a paid order that is ready for pickup. The first wave
 * goes to the nearest riders; `widen` (or no rider nearby) sends it to every free
 * rider online. Riders already alerted are not alerted again.
 */
export async function offerOrder(orderId: string, options: { widen?: boolean } = {}) {
  const none: OfferRound = { alerted: 0, open: 0, wave: 0, firstOfferedAt: null };
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      assignedRiderId: true,
      vendor: { select: { suburb: true, city: true, latitude: true, longitude: true } },
    },
  });
  if (!order || order.status !== "READY_FOR_PICKUP" || order.assignedRiderId) return none;
  if (!PAID_STATUSES.includes(order.paymentStatus.toUpperCase())) return none;

  const existing = await offersFor(order.id);
  const offeredIds = new Set(existing.map((offer) => offer.rider_id));
  const currentWave = existing.reduce((max, offer) => Math.max(max, Number(offer.wave)), 0);

  const candidates = await candidateRiders(order.id, order.vendor);
  const nearby = candidates.filter((rider) => isNearby(rider, order.vendor));
  // Nobody close by, or nobody accepted in time: everyone free and online hears.
  const wave = options.widen || currentWave >= 2 || nearby.length === 0 ? 2 : 1;
  const targets =
    wave === 2
      ? candidates
      : nearby.slice(0, Math.max(0, FIRST_WAVE_SIZE - existing.filter((o) => o.wave === 1).length));

  const now = new Date().toISOString();
  let alerted = 0;
  for (const rider of targets) {
    if (offeredIds.has(rider.id)) continue;
    const offerId = crypto.randomUUID();
    const inserted = await prisma.$executeRawUnsafe(
      `INSERT INTO app_dispatch_offers (id, order_id, rider_id, wave, status, distance_km, created_at, updated_at)
       VALUES (${markers(1, 8)}) ON CONFLICT (order_id, rider_id) DO NOTHING`,
      offerId,
      order.id,
      rider.id,
      wave,
      "OFFERED",
      rider.distanceKm,
      now,
      now,
    );
    if (Number(inserted) === 0) continue;
    alerted += 1;
    if (await claimOrderNotification(order.id, `offer:${offerId}`, "rider")) {
      await notifyRiderOfOffer(order.id, rider.id, rider.distanceKm).catch(() => null);
    }
  }

  const after = await offersFor(order.id);
  const open = after.filter((offer) => offer.status === "OFFERED").length;
  const firstOfferedAt =
    after
      .map((offer) => String(offer.created_at))
      .sort()
      .at(0) || null;
  return { alerted, open, wave: Math.max(wave, currentWave), firstOfferedAt } as OfferRound;
}

export type AcceptResult = "accepted" | "taken" | "not-offered" | "busy";

/** The first rider to accept gets the order; everyone else sees it has been taken. */
export async function acceptOffer(riderId: string, orderRef: string): Promise<AcceptResult> {
  await ensureRiderOfferTables();
  const order = await prisma.order.findFirst({
    where: { OR: [{ publicId: orderRef }, { ozowReference: orderRef }] },
    select: { id: true, publicId: true, ozowReference: true, status: true, assignedRiderId: true },
  });
  if (!order) return "not-offered";
  const rows = await prisma.$queryRawUnsafe<Array<{ status: string }>>(
    `SELECT status FROM app_dispatch_offers WHERE order_id = ${marker(1)} AND rider_id = ${marker(2)}`,
    order.id,
    riderId,
  );
  if (rows.length === 0) return "not-offered";
  if (order.assignedRiderId === riderId) return "accepted";
  if (
    rows[0].status !== "OFFERED" ||
    order.status !== "READY_FOR_PICKUP" ||
    order.assignedRiderId
  ) {
    return "taken";
  }

  const rider = await prisma.riderApplication.findUnique({
    where: { id: riderId },
    select: { id: true, fullName: true, phone: true, status: true },
  });
  if (!rider || rider.status !== "APPROVED") return "not-offered";
  if ((await busyRiderIds()).has(rider.id)) return "busy";

  // Only one rider can move the order out of READY_FOR_PICKUP, however many tap at once.
  const claimed = await prisma.order.updateMany({
    where: { id: order.id, status: "READY_FOR_PICKUP", assignedRiderId: null },
    data: { status: "RIDER_ASSIGNED", assignedRiderId: rider.id, statusReason: null },
  });
  if (claimed.count === 0) return "taken";

  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `UPDATE app_dispatch_offers SET status = 'ACCEPTED', updated_at = ${marker(1)}
     WHERE order_id = ${marker(2)} AND rider_id = ${marker(3)}`,
    now,
    order.id,
    rider.id,
  );
  await closeOpenOffers(order.id, rider.id);
  await createDispatchAssignment({
    orderId: order.id,
    publicId: order.publicId,
    riderApplicationId: rider.id,
    riderName: rider.fullName,
    riderPhone: rider.phone,
    note: "Accepted a delivery request",
    actor: `rider:${rider.id}`,
  });
  await recordOrderEvent({
    orderId: order.id,
    publicId: order.publicId,
    type: "RIDER_ASSIGNED",
    actor: `rider:${rider.id}`,
    note: "Accepted a delivery request",
    meta: { riderId: rider.id, riderName: rider.fullName },
  });
  try {
    await pusherServer.trigger(`order-${order.ozowReference || order.publicId}`, "status", {
      status: "RIDER_ASSIGNED",
      at: now,
    });
  } catch {
    // realtime may be disabled
  }
  // The assignment is saved even if a message cannot go out.
  await notifyRiderOfAssignment(order.id, rider.id).catch(() => null);
  await settleWithin(notifyOrderStatusPush(order.id, "RIDER_ASSIGNED"), 3000);
  return "accepted";
}

/** "Not now": the rider is not alerted about this order again. */
export async function declineOffer(riderId: string, orderRef: string) {
  await ensureRiderOfferTables();
  const order = await prisma.order.findFirst({
    where: { OR: [{ publicId: orderRef }, { ozowReference: orderRef }] },
    select: { id: true },
  });
  if (!order) return { ok: false as const, orderId: null };
  const changed = await prisma.$executeRawUnsafe(
    `UPDATE app_dispatch_offers SET status = 'DECLINED', updated_at = ${marker(1)}
     WHERE order_id = ${marker(2)} AND rider_id = ${marker(3)} AND status = 'OFFERED'`,
    new Date().toISOString(),
    order.id,
    riderId,
  );
  return { ok: Number(changed) > 0, orderId: order.id };
}

export type RiderOfferView = {
  ref: string;
  vendor: string;
  pickupArea: string;
  dropoffArea: string;
  distanceKm: number | null;
  earnCents: number;
  offeredAt: string;
  /** Cash on delivery: what the rider collects at the door, else 0. */
  collectCashCents: number;
};

/** Open delivery requests for one rider. The customer's name and phone stay hidden until they accept. */
export async function listRiderOffers(riderId: string): Promise<RiderOfferView[]> {
  await ensureRiderOfferTables();
  const rows = await prisma.$queryRawUnsafe<
    Array<{ order_id: string; distance_km: number | null; created_at: string }>
  >(
    `SELECT order_id, distance_km, created_at FROM app_dispatch_offers
     WHERE rider_id = ${marker(1)} AND status = 'OFFERED' ORDER BY created_at DESC LIMIT 10`,
    riderId,
  );
  if (rows.length === 0) return [];
  const orders = await prisma.order.findMany({
    where: {
      id: { in: rows.map((row) => row.order_id) },
      status: "READY_FOR_PICKUP",
      assignedRiderId: null,
      paymentStatus: { in: PAID_STATUSES },
    },
    select: {
      id: true,
      publicId: true,
      ozowReference: true,
      itemsJson: true,
      deliveryFeeCents: true,
      riderTipCents: true,
      riderPayoutCents: true,
      totalCents: true,
      paymentStatus: true,
      vendor: { select: { name: true, address: true, suburb: true, city: true } },
    },
  });
  const byId = new Map(orders.map((order) => [order.id, order] as const));
  return rows.flatMap((row) => {
    const order = byId.get(row.order_id);
    if (!order) return [];
    let dropoffArea = "";
    try {
      dropoffArea = String(
        JSON.parse(order.itemsJson || "{}")?.deliveryDetails?.destinationSuburb || "",
      );
    } catch {
      dropoffArea = "";
    }
    return [
      {
        ref: order.publicId || order.ozowReference || order.id,
        vendor: order.vendor.name,
        pickupArea: [order.vendor.address, order.vendor.suburb].filter(Boolean).join(", "),
        dropoffArea: dropoffArea.trim(),
        distanceKm: row.distance_km === null ? null : Number(row.distance_km),
        earnCents: order.riderPayoutCents || order.deliveryFeeCents + (order.riderTipCents || 0),
        offeredAt: String(row.created_at),
        collectCashCents: isCashOnDelivery(order.paymentStatus) ? order.totalCents : 0,
      },
    ];
  });
}
