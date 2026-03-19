"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import OrderMap from "@/components/OrderMap";
import { formatZAR } from "@/lib/format";
import { getPusherClient } from "@/lib/pusher-client";
import {
  getTrackingStatusDetail,
  getTrackingStatusLabel,
  isTerminalTrackingStatus,
  normalizeTrackingStatus,
  type TrackingOrderStatus,
} from "@/lib/order-tracking";

type Props = { params: { ref: string } };

type OrderItem = {
  itemId?: string;
  name?: string;
  qty?: number;
  priceCents?: number;
};

type TrackingPayload = {
  status: TrackingOrderStatus;
  statusLabel: string;
  statusDetail: string;
  etaLabel: string;
  progressPct: number;
  rider?: { lat: number; lng: number } | null;
  hasLiveRider: boolean;
};

type OrderPayload = {
  id: string;
  publicId?: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt?: string;
  totalCents: number;
  items?: OrderItem[];
  vendor?: {
    name?: string;
    latitude?: number | null;
    longitude?: number | null;
    suburb?: string | null;
    city?: string | null;
  } | null;
  destination?: { lat: number; lng: number } | null;
  rider?: {
    lat: number;
    lng: number;
    speed?: number | null;
    locatedAt?: string | null;
    simulated?: boolean;
  } | null;
  tracking?: TrackingPayload | null;
};

const STAGES: TrackingOrderStatus[] = ["PLACED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];

function normalizeRef(value: string) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "-").replace(/-+/g, "-");
}

function formatDateTime(value?: string | null) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString();
}

function formatLocation(vendor?: OrderPayload["vendor"]) {
  return [vendor?.suburb, vendor?.city].filter(Boolean).join(", ") || "Location updating";
}

function buildFallbackTracking(order: OrderPayload): TrackingPayload {
  const status = normalizeTrackingStatus(order.status);
  return {
    status,
    statusLabel: getTrackingStatusLabel(status),
    statusDetail: getTrackingStatusDetail(status),
    etaLabel:
      status === "PLACED"
        ? "35-45 min"
        : status === "PREPARING"
          ? "20-30 min"
          : status === "OUT_FOR_DELIVERY"
            ? "8-15 min"
            : status === "DELIVERED"
              ? "Delivered"
              : "Canceled",
    progressPct:
      status === "PLACED" ? 12 : status === "PREPARING" ? 42 : status === "OUT_FOR_DELIVERY" ? 78 : 100,
    rider: order.rider ? { lat: order.rider.lat, lng: order.rider.lng } : null,
    hasLiveRider: Boolean(order.rider && !order.rider.simulated),
  };
}

export default function OrderTrackingPage({ params }: Props) {
  const [ref] = useState(() => normalizeRef(params.ref));
  const [order, setOrder] = useState<OrderPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(ref)}`, { cache: "no-store" });
      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json?.ok || !json.order) {
        setOrder(null);
        setError(
          response.status === 404
            ? "Order not found. Please check your reference and try again."
            : "Could not load order tracking right now."
        );
        return;
      }

      setOrder(json.order as OrderPayload);
    } catch {
      setOrder(null);
      setError("Could not load order tracking right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ref]);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    if (!order || isTerminalTrackingStatus(order.status) || document.visibilityState !== "visible") return;
    const timer = window.setInterval(() => {
      void load(true);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [load, order]);

  useEffect(() => {
    if (!order || isTerminalTrackingStatus(order.status)) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    };

    window.addEventListener("focus", refreshIfVisible);
    window.addEventListener("online", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.removeEventListener("focus", refreshIfVisible);
      window.removeEventListener("online", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [load, order]);

  useEffect(() => {
    if (loading || error) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = `order-${ref}`;
    const channel = pusher.subscribe(channelName);

    const onEvent = () => {
      setLastEventAt(new Date().toISOString());
      void load(true);
    };

    channel.bind("status", onEvent);
    channel.bind("location", onEvent);

    return () => {
      channel.unbind("status", onEvent);
      channel.unbind("location", onEvent);
      pusher.unsubscribe(channelName);
    };
  }, [error, load, loading, ref]);

  const tracking = useMemo(() => (order ? order.tracking || buildFallbackTracking(order) : null), [order]);
  const stageIndex = tracking ? STAGES.indexOf(tracking.status) : -1;
  const vendorPoint =
    order?.vendor?.latitude != null && order?.vendor?.longitude != null
      ? { lat: Number(order.vendor.latitude), lng: Number(order.vendor.longitude) }
      : null;
  const destinationPoint = order?.destination
    ? { lat: Number(order.destination.lat), lng: Number(order.destination.lng) }
    : null;
  const riderPoint = tracking?.rider || null;
  const items = order?.items ?? [];

  return (
    <div className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />
      <main className="container py-10 md:py-14">
        <h1 className="text-2xl font-bold">Order tracking</h1>
        <p className="mt-1 text-white/70">
          Reference: <span className="font-mono">{ref}</span>
        </p>

        {loading ? (
          <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/80">
            Loading live tracking...
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-xl border border-red-300/30 bg-red-300/10 p-4">
            <p className="text-sm text-red-100">{error}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <Link href="/track" className="underline">
                Try another reference
              </Link>
              <Link href="/" className="underline">
                Back to home
              </Link>
            </div>
          </div>
        ) : null}

        {!loading && !error && order && tracking ? (
          <>
            <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4">
              <div className="grid gap-2 text-sm text-white/75 sm:grid-cols-3">
                <div>
                  Current stage: <span className="font-semibold text-white">{tracking.statusLabel}</span>
                </div>
                <div>
                  ETA: <span className="font-semibold text-white">{tracking.etaLabel}</span>
                </div>
                <div>
                  Total: <span className="font-semibold text-white">{formatZAR(order.totalCents)}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr,1.15fr]">
              <div>
                <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">Order journey</div>
                    {normalizeTrackingStatus(order.status) === "CANCELED" ? <StatusBadge>Canceled</StatusBadge> : null}
                  </div>
                  <p className="mt-3 text-sm text-white/75">{tracking.statusDetail}</p>
                  <div className="mt-4 h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-lethela-primary" style={{ width: `${tracking.progressPct}%` }} />
                  </div>
                  <ol className="mt-5 relative border-l border-white/20 pl-6">
                    {STAGES.map((stage, index) => {
                      const reached = stageIndex >= index;
                      const current = tracking.status === stage;
                      return (
                        <li key={stage} className="mb-6">
                          <span
                            className={`absolute -left-[9px] top-[2px] h-4 w-4 rounded-full ${
                              reached ? "bg-lethela-primary" : "bg-white/30"
                            }`}
                          />
                          <div className={`font-medium ${reached ? "" : "text-white/60"}`}>
                            {stage.replaceAll("_", " ")}
                          </div>
                          <p className="mt-1 text-xs text-white/60">
                            {current ? tracking.statusDetail : getTrackingStatusDetail(stage)}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4">
                  <div className="font-semibold">Order summary</div>
                  <div className="mt-3 space-y-3">
                    {items.length > 0 ? (
                      items.map((item, index) => (
                        <div
                          key={`${item.itemId || item.name || "item"}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">{item.name || "Item"}</p>
                            <p className="mt-1 text-xs text-white/56">Qty {item.qty || 1}</p>
                          </div>
                          <p className="text-sm font-semibold text-white">
                            {formatZAR((item.priceCents || 0) * (item.qty || 1))}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-white/10 px-3 py-3 text-sm text-white/68">
                        Item details will appear once the order payload is available.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">Live map</div>
                    <div className="text-sm text-white/80">
                      {tracking.hasLiveRider ? "Live rider signal" : "Smart route estimate"}
                    </div>
                  </div>
                  <div className="mt-3">
                    <OrderMap rider={riderPoint} vendor={vendorPoint} dest={destinationPoint} />
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-white/60">
                    <p>
                      Vendor: {order.vendor?.name || "Unknown"} | Area: {formatLocation(order.vendor)}
                    </p>
                    <p>
                      {refreshing
                        ? "Refreshing..."
                        : `Last updated ${formatDateTime(lastEventAt || order.updatedAt || order.createdAt)}`}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4">
                  <div className="grid gap-2 text-sm text-white/75 sm:grid-cols-2">
                    <div>
                      Payment: <span className="font-semibold text-white">{order.paymentStatus}</span>
                    </div>
                    <div>
                      Rider signal:{" "}
                      <span className="font-semibold text-white">
                        {tracking.hasLiveRider
                          ? "Live"
                          : tracking.status === "OUT_FOR_DELIVERY"
                            ? "Estimated"
                            : "Pending"}
                      </span>
                    </div>
                    <div>
                      Placed: <span className="font-semibold text-white">{formatDateTime(order.createdAt)}</span>
                    </div>
                    <div>
                      Reference: <span className="font-semibold text-white">{ref}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/track" className="underline">
                Track another order
              </Link>
            </div>
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

function StatusBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/78">{children}</span>;
}
