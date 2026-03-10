"use client";

import { useEffect, useMemo, useState } from "react";
import OrderMap from "@/components/OrderMap";
import DashCard from "./DashCard";

type OrderStatus =
  | "PLACED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELED";

type Order = {
  publicId: string;
  status: OrderStatus;
  paymentStatus: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  createdAt: string;
  customerLat: number | null;
  customerLng: number | null;
  vendor: { latitude: number | null; longitude: number | null } | null;
  items: { id: string; qty: number; product: { name: string } | null }[];
};

const STATUS: Array<OrderStatus> = [
  "PLACED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELED",
];

export default function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<
    Record<string, { lat: number; lng: number; progress: number }>
  >({});

  async function load(showInitialLoader = false) {
    if (showInitialLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);
    try {
      const response = await fetch("/api/vendors/orders", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load orders");
      }

      const nextOrders: Order[] = (json.orders || []).map((order: any) => ({
        publicId: order.publicId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        subtotalCents: order.subtotalCents,
        deliveryFeeCents: order.deliveryFeeCents,
        totalCents: order.totalCents,
        createdAt: order.createdAt,
        customerLat: order.customerLat,
        customerLng: order.customerLng,
        vendor: order.vendor,
        items: order.items,
      }));

      setOrders(nextOrders);
      setSelectedId((current) => {
        if (current && nextOrders.some((order) => order.publicId === current)) {
          return current;
        }
        return nextOrders[0]?.publicId ?? null;
      });
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(async () => {
      const activeOrders = orders.filter(
        (order) =>
          order.status === "OUT_FOR_DELIVERY" || order.status === "PREPARING"
      );
      if (activeOrders.length === 0) return;

      const updates = await Promise.all(
        activeOrders.map(async (order) => {
          const response = await fetch(
            `/api/vendors/orders/track?id=${encodeURIComponent(order.publicId)}`
          );
          const json = await response.json();
          return json?.ok ? { id: order.publicId, driver: json.driver } : null;
        })
      );

      setTracking((current) => {
        const next = { ...current };
        for (const update of updates) {
          if (!update) continue;
          next[update.id] = update.driver;
        }
        return next;
      });
    }, 7000);

    return () => clearInterval(timer);
  }, [orders]);

  const statusCounts = useMemo(() => {
    const counts: Record<"ALL" | OrderStatus, number> = {
      ALL: orders.length,
      PLACED: 0,
      PREPARING: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      CANCELED: 0,
    };

    for (const order of orders) {
      counts[order.status] += 1;
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const text = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (filter !== "ALL" && order.status !== filter) {
        return false;
      }
      if (!text) return true;

      const haystack = [
        order.publicId,
        order.status,
        order.paymentStatus,
        ...order.items.map((item) => item.product?.name || "item"),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(text);
    });
  }, [filter, orders, query]);

  const selectedOrder =
    filteredOrders.find((order) => order.publicId === selectedId) ||
    orders.find((order) => order.publicId === selectedId) ||
    null;

  async function updateStatus(publicId: string, status: OrderStatus) {
    setError(null);
    const response = await fetch(`/api/vendors/orders/${encodeURIComponent(publicId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      setError(json.error || "Failed to update order status");
      return;
    }

    setOrders((current) =>
      current.map((order) => (order.publicId === publicId ? { ...order, status } : order))
    );
  }

  return (
    <DashCard title="Orders">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          {(["ALL", ...STATUS] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full border px-3 py-1 transition-colors ${
                filter === value
                  ? "border-lethela-primary bg-lethela-primary/10 text-white"
                  : "border-white/15 text-white/70 hover:border-white/35 hover:text-white"
              }`}
            >
              {value === "ALL" ? "All" : value.replaceAll("_", " ")} ({statusCounts[value]})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search order id or item"
            className="rounded border border-white/15 bg-white px-3 py-2 text-sm text-black"
          />
          <button
            type="button"
            onClick={() => load(false)}
            disabled={refreshing}
            className="rounded border border-white/20 px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-white/70">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="mt-4 text-sm text-white/70">No orders match the current filters.</div>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const driver = tracking[order.publicId];
              const isSelected = selectedId === order.publicId;

              return (
                <button
                  key={order.publicId}
                  type="button"
                  onClick={() => setSelectedId(order.publicId)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-lethela-primary bg-white/10"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{order.publicId}</div>
                      <div className="mt-1 text-xs text-white/70">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded border border-white/20 px-2 py-1">
                        {order.status.replaceAll("_", " ")}
                      </span>
                      <span className="rounded border border-white/20 px-2 py-1">
                        Payment: {order.paymentStatus}
                      </span>
                      <span className="rounded border border-white/20 px-2 py-1 font-semibold">
                        R{(order.totalCents / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-white/85">
                    {order.items.map((item, index) => (
                      <span key={item.id}>
                        {item.product?.name ?? "Item"} x {item.qty}
                        {index < order.items.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>

                  {driver ? (
                    <div className="mt-3 h-2 rounded bg-white/10">
                      <div
                        className="h-2 rounded bg-lethela-primary"
                        style={{ width: `${Math.round(driver.progress * 100)}%` }}
                      />
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {selectedOrder ? (
            <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.12em] text-white/60">
                    Selected order
                  </div>
                  <div className="mt-1 text-lg font-semibold">{selectedOrder.publicId}</div>
                </div>

                <select
                  value={selectedOrder.status}
                  onChange={(event) =>
                    void updateStatus(
                      selectedOrder.publicId,
                      event.target.value as OrderStatus
                    )
                  }
                  className="rounded bg-white px-3 py-2 text-sm text-black"
                >
                  {STATUS.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <div className="text-xs text-white/60">Subtotal</div>
                  <div className="mt-1 font-semibold">
                    R{(selectedOrder.subtotalCents / 100).toFixed(2)}
                  </div>
                </div>
                <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <div className="text-xs text-white/60">Delivery</div>
                  <div className="mt-1 font-semibold">
                    R{(selectedOrder.deliveryFeeCents / 100).toFixed(2)}
                  </div>
                </div>
                <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <div className="text-xs text-white/60">Total</div>
                  <div className="mt-1 font-semibold">
                    R{(selectedOrder.totalCents / 100).toFixed(2)}
                  </div>
                </div>
                <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <div className="text-xs text-white/60">Payment</div>
                  <div className="mt-1 font-semibold">{selectedOrder.paymentStatus}</div>
                </div>
              </div>

              <div className="rounded border border-white/10 bg-black/20 p-3 text-sm">
                <div className="text-xs uppercase tracking-[0.12em] text-white/60">
                  Items
                </div>
                <ul className="mt-2 space-y-1 text-white/85">
                  {selectedOrder.items.map((item) => (
                    <li key={item.id}>
                      {item.product?.name ?? "Item"} x {item.qty}
                    </li>
                  ))}
                </ul>
              </div>

              {selectedOrder.customerLat != null && selectedOrder.customerLng != null ? (
                <OrderMap
                  rider={tracking[selectedOrder.publicId] || null}
                  vendor={
                    selectedOrder.vendor?.latitude != null &&
                    selectedOrder.vendor?.longitude != null
                      ? {
                          lat: selectedOrder.vendor.latitude,
                          lng: selectedOrder.vendor.longitude,
                        }
                      : null
                  }
                  dest={{
                    lat: selectedOrder.customerLat,
                    lng: selectedOrder.customerLng,
                  }}
                />
              ) : (
                <div className="rounded border border-white/10 bg-black/20 p-3 text-sm text-white/70">
                  No delivery coordinates available for this order yet.
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {error ? <p className="mt-3 text-xs text-red-200">{error}</p> : null}
    </DashCard>
  );
}
