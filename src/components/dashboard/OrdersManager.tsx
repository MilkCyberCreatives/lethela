"use client";

import { useEffect, useMemo, useState } from "react";
import OrderMap from "@/components/OrderMap";
import DashCard from "./DashCard";

type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "NEW"
  | "VENDOR_ACCEPTED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "RIDER_ASSIGNED"
  | "PICKED_UP"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUND_REQUESTED"
  | "REFUNDED"
  | "FAILED";

type VendorOrderAction = "VENDOR_ACCEPTED" | "PREPARING" | "READY_FOR_PICKUP" | "CANCELLED";
type WorkflowFilter = "ACTION" | "DELIVERY" | "EXCEPTIONS" | "COMPLETED" | "ALL";

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
  deliveryDetails: {
    customerName?: string;
    customerPhone?: string;
    whatsappNumber?: string;
    standNumber?: string;
    streetSection?: string;
    landmark?: string;
    destinationSuburb?: string;
    deliveryNotes?: string;
    containsAlcohol?: boolean;
    ageConfirmed?: boolean;
    deliveryDistanceKm?: number | null;
    riderTipCents?: number;
    riderPayoutCents?: number;
    vendorPayoutCents?: number;
    platformFeeCents?: number;
  } | null;
};

const WORKFLOW_FILTERS: Array<{ value: WorkflowFilter; label: string }> = [
  { value: "ACTION", label: "Needs action" },
  { value: "DELIVERY", label: "In delivery" },
  { value: "EXCEPTIONS", label: "Exceptions" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ALL", label: "All orders" },
];

const ACTION_STATUSES: OrderStatus[] = ["NEW", "VENDOR_ACCEPTED", "PREPARING"];
const DELIVERY_STATUSES: OrderStatus[] = [
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "ON_THE_WAY",
];
const EXCEPTION_STATUSES: OrderStatus[] = ["CANCELLED", "REFUND_REQUESTED", "REFUNDED", "FAILED"];

function vendorActions(status: OrderStatus): VendorOrderAction[] {
  if (status === "NEW") return ["VENDOR_ACCEPTED", "CANCELLED"];
  if (status === "VENDOR_ACCEPTED") return ["PREPARING", "CANCELLED"];
  if (status === "PREPARING") return ["READY_FOR_PICKUP", "CANCELLED"];
  return [];
}

function actionLabel(action: VendorOrderAction) {
  if (action === "VENDOR_ACCEPTED") return "Accept order";
  if (action === "PREPARING") return "Start preparing";
  if (action === "READY_FOR_PICKUP") return "Ready for rider";
  return "Cancel order";
}

function workflowGuidance(status: OrderStatus) {
  if (status === "NEW") {
    return { title: "Accept this order", note: "Confirm that the store can fulfil it now." };
  }
  if (status === "VENDOR_ACCEPTED") {
    return { title: "Start preparing", note: "Move the order into preparation when work begins." };
  }
  if (status === "PREPARING") {
    return {
      title: "Finish and call the rider",
      note: "Mark it ready only when pickup can happen.",
    };
  }
  if (status === "READY_FOR_PICKUP") {
    return { title: "Waiting for rider", note: "Keep the order packed and ready for collection." };
  }
  if (["RIDER_ASSIGNED", "PICKED_UP", "ON_THE_WAY"].includes(status)) {
    return {
      title: "Delivery in progress",
      note: "Use live tracking below if a rider position is available.",
    };
  }
  if (status === "DELIVERED") {
    return { title: "Order complete", note: "No vendor action is required." };
  }
  if (EXCEPTION_STATUSES.includes(status)) {
    return {
      title: "Review exception",
      note: "Keep the order reference ready if support is needed.",
    };
  }
  return { title: "Monitor payment", note: "Wait for the order to become payable and actionable." };
}

function workflowMatch(order: Order, filter: WorkflowFilter) {
  if (filter === "ACTION") return ACTION_STATUSES.includes(order.status);
  if (filter === "DELIVERY") return DELIVERY_STATUSES.includes(order.status);
  if (filter === "EXCEPTIONS") return EXCEPTION_STATUSES.includes(order.status);
  if (filter === "COMPLETED") return order.status === "DELIVERED";
  return true;
}

function workflowPriority(status: OrderStatus) {
  const priorities: Partial<Record<OrderStatus, number>> = {
    NEW: 0,
    VENDOR_ACCEPTED: 1,
    PREPARING: 2,
    READY_FOR_PICKUP: 3,
    RIDER_ASSIGNED: 4,
    PICKED_UP: 5,
    ON_THE_WAY: 6,
    PAID: 7,
    PENDING_PAYMENT: 8,
    REFUND_REQUESTED: 9,
    FAILED: 10,
    CANCELLED: 11,
    REFUNDED: 12,
    DELIVERED: 13,
  };
  return priorities[status] ?? 99;
}

export default function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<WorkflowFilter>("ALL");
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
        deliveryDetails: order.deliveryDetails ?? null,
      }));

      const firstPriorityOrder =
        nextOrders.find((order) => ACTION_STATUSES.includes(order.status)) ||
        nextOrders.find((order) => DELIVERY_STATUSES.includes(order.status)) ||
        nextOrders[0] ||
        null;

      setOrders(nextOrders);
      setSelectedId((current) => {
        if (current && nextOrders.some((order) => order.publicId === current)) {
          return current;
        }
        return firstPriorityOrder?.publicId ?? null;
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
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;

      const activeOrders = orders.filter((order) => DELIVERY_STATUSES.includes(order.status));
      if (activeOrders.length === 0) return;

      const updates = await Promise.all(
        activeOrders.map(async (order) => {
          const response = await fetch(
            `/api/vendors/orders/track?id=${encodeURIComponent(order.publicId)}`,
          );
          const json = await response.json();
          return { id: order.publicId, driver: json?.ok ? json.driver : null };
        }),
      );

      setTracking((current) => {
        const next = { ...current };
        for (const update of updates) {
          if (update.driver) next[update.id] = update.driver;
          else delete next[update.id];
        }
        return next;
      });
    }, 7000);

    return () => window.clearInterval(timer);
  }, [orders]);

  const workflowCounts = useMemo(
    () => ({
      ALL: orders.length,
      ACTION: orders.filter((order) => ACTION_STATUSES.includes(order.status)).length,
      DELIVERY: orders.filter((order) => DELIVERY_STATUSES.includes(order.status)).length,
      EXCEPTIONS: orders.filter((order) => EXCEPTION_STATUSES.includes(order.status)).length,
      COMPLETED: orders.filter((order) => order.status === "DELIVERED").length,
    }),
    [orders],
  );

  const priorityOrder = useMemo(
    () =>
      orders.find((order) => ACTION_STATUSES.includes(order.status)) ||
      orders.find((order) => DELIVERY_STATUSES.includes(order.status)) ||
      null,
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const text = query.trim().toLowerCase();
    return orders
      .filter((order) => {
        if (!workflowMatch(order, filter)) return false;
        if (!text) return true;

        const haystack = [
          order.publicId,
          order.status,
          order.paymentStatus,
          order.deliveryDetails?.customerName,
          order.deliveryDetails?.customerPhone,
          order.deliveryDetails?.whatsappNumber,
          order.deliveryDetails?.destinationSuburb,
          order.deliveryDetails?.landmark,
          ...order.items.map((item) => item.product?.name || "item"),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(text);
      })
      .sort((left, right) => {
        const priorityDifference = workflowPriority(left.status) - workflowPriority(right.status);
        if (priorityDifference !== 0) return priorityDifference;
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  }, [filter, orders, query]);

  const selectedOrder =
    filteredOrders.find((order) => order.publicId === selectedId) ||
    orders.find((order) => order.publicId === selectedId) ||
    null;

  async function updateStatus(publicId: string, status: VendorOrderAction) {
    setError(null);
    const reason =
      status === "CANCELLED"
        ? window.prompt("Why is this order being cancelled? This is recorded for support.")
        : null;
    if (status === "CANCELLED" && !reason) return;
    if (!window.confirm(`${actionLabel(status)} for ${publicId}?`)) return;

    const response = await fetch(`/api/vendors/orders/${encodeURIComponent(publicId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      setError(json.error || "Failed to update order status");
      return;
    }

    setOrders((current) =>
      current.map((order) => (order.publicId === publicId ? { ...order, status } : order)),
    );
  }

  return (
    <DashCard title="Orders">
      <div className="rounded-xl border border-lethela-primary/20 bg-lethela-primary/[0.07] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethela-primary">
              Next action
            </p>
            {priorityOrder ? (
              <>
                <p className="mt-1 text-sm font-semibold text-white">
                  {ACTION_STATUSES.includes(priorityOrder.status)
                    ? `${workflowCounts.ACTION} order${workflowCounts.ACTION === 1 ? "" : "s"} need vendor action`
                    : `${workflowCounts.DELIVERY} order${workflowCounts.DELIVERY === 1 ? "" : "s"} in delivery`}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  {workflowGuidance(priorityOrder.status).title}: {priorityOrder.publicId}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm font-semibold text-white">
                  No active orders need action
                </p>
                <p className="mt-1 text-xs text-white/60">
                  New paid orders will move to the front of this workspace automatically.
                </p>
              </>
            )}
          </div>
          {priorityOrder ? (
            <button
              type="button"
              onClick={() => {
                const nextFilter = ACTION_STATUSES.includes(priorityOrder.status)
                  ? "ACTION"
                  : "DELIVERY";
                setFilter(nextFilter);
                setSelectedId(priorityOrder.publicId);
              }}
              className="inline-flex min-h-11 items-center rounded-lg bg-lethela-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              Open priority order
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs" aria-label="Order workflow filters">
          {WORKFLOW_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`min-h-10 rounded-full border px-3 py-2 transition-colors ${
                filter === item.value
                  ? "border-lethela-primary bg-lethela-primary/10 text-white"
                  : "border-white/15 text-white/70 hover:border-white/35 hover:text-white"
              }`}
            >
              {item.label} ({workflowCounts[item.value]})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search order, customer or item"
            className="min-h-11 rounded border border-white/15 bg-white px-3 py-2 text-sm text-black"
          />
          <button
            type="button"
            onClick={() => load(false)}
            disabled={refreshing}
            className="min-h-11 rounded border border-white/20 px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 grid animate-pulse gap-3">
          <div className="h-20 rounded-lg bg-white/10" />
          <div className="h-20 rounded-lg bg-white/10" />
          <div className="h-20 rounded-lg bg-white/10" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
          No orders match this workflow view. Choose another view or clear the search.
        </div>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const driver = tracking[order.publicId];
              const isSelected = selectedId === order.publicId;
              const guidance = workflowGuidance(order.status);

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
                  <p className="mt-2 text-xs text-lethela-primary/90">
                    {guidance.title} · <span className="text-white/55">{guidance.note}</span>
                  </p>

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
              <div className="rounded-lg border border-lethela-primary/20 bg-lethela-primary/[0.06] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-lethela-primary">
                  Next step
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {workflowGuidance(selectedOrder.status).title}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  {workflowGuidance(selectedOrder.status).note}
                </p>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.12em] text-white/60">
                    Selected order
                  </div>
                  <div className="mt-1 text-lg font-semibold">{selectedOrder.publicId}</div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  {vendorActions(selectedOrder.status).map((status, index) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => void updateStatus(selectedOrder.publicId, status)}
                      className={`min-h-10 rounded border px-3 py-2 text-xs font-semibold transition-colors ${
                        status === "CANCELLED"
                          ? "border-red-300/40 text-red-100 hover:bg-red-300/10"
                          : index === 0
                            ? "border-lethela-primary bg-lethela-primary text-white hover:opacity-90"
                            : "border-white/20 hover:border-lethela-primary"
                      }`}
                    >
                      {actionLabel(status)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <div className="text-xs text-white/60">Subtotal</div>
                  <div className="mt-1 font-semibold">
                    R{(selectedOrder.subtotalCents / 100).toFixed(2)}
                  </div>
                </div>
                <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <div className="text-xs text-white/60">Rider delivery fee</div>
                  <div className="mt-1 font-semibold">
                    R{(selectedOrder.deliveryFeeCents / 100).toFixed(2)}
                  </div>
                </div>
                <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <div className="text-xs text-white/60">Rider tip</div>
                  <div className="mt-1 font-semibold">
                    R{((selectedOrder.deliveryDetails?.riderTipCents || 0) / 100).toFixed(2)}
                  </div>
                </div>
                <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <div className="text-xs text-white/60">Rider payout</div>
                  <div className="mt-1 font-semibold">
                    R
                    {(
                      (selectedOrder.deliveryDetails?.riderPayoutCents ||
                        selectedOrder.deliveryFeeCents) / 100
                    ).toFixed(2)}
                  </div>
                </div>
                <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <div className="text-xs text-white/60">Total paid</div>
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
                <div className="text-xs uppercase tracking-[0.12em] text-white/60">Items</div>
                <ul className="mt-2 space-y-1 text-white/85">
                  {selectedOrder.items.map((item) => (
                    <li key={item.id}>
                      {item.product?.name ?? "Item"} x {item.qty}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded border border-white/10 bg-black/20 p-3 text-sm">
                <div className="text-xs uppercase tracking-[0.12em] text-white/60">
                  Delivery details
                </div>
                {selectedOrder.deliveryDetails ? (
                  <div className="mt-2 space-y-1 text-white/85">
                    <div>Name: {selectedOrder.deliveryDetails.customerName || "Not supplied"}</div>
                    <div>
                      Phone:{" "}
                      {selectedOrder.deliveryDetails.customerPhone ||
                        selectedOrder.deliveryDetails.whatsappNumber ||
                        "Not supplied"}
                    </div>
                    <div>
                      Address:{" "}
                      {[
                        selectedOrder.deliveryDetails.standNumber,
                        selectedOrder.deliveryDetails.streetSection,
                        selectedOrder.deliveryDetails.destinationSuburb,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Not supplied"}
                    </div>
                    {selectedOrder.deliveryDetails.landmark ? (
                      <div>Landmark: {selectedOrder.deliveryDetails.landmark}</div>
                    ) : null}
                    {selectedOrder.deliveryDetails.deliveryNotes ? (
                      <div>Notes: {selectedOrder.deliveryDetails.deliveryNotes}</div>
                    ) : null}
                    {selectedOrder.deliveryDetails.deliveryDistanceKm != null ? (
                      <div>
                        Distance:{" "}
                        {Number(selectedOrder.deliveryDetails.deliveryDistanceKm).toFixed(2)} km
                      </div>
                    ) : null}
                    {selectedOrder.deliveryDetails.containsAlcohol ? (
                      <div className="text-amber-100">Liquor order — ID check required.</div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-2 text-white/65">No delivery notes were captured.</div>
                )}
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
