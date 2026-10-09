"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight, RefreshCw, Search, ShoppingBag } from "lucide-react";
import OrderMap from "@/components/OrderMap";
import {
  DetailRow,
  EmptyState,
  FilterTabs,
  Notice,
  Panel,
  ProgressBar,
  StatusBadge,
  dashButton,
  dashField,
  statusText,
  toneForStatus,
} from "@/components/dashboard/kit/ui";
import { cn } from "@/lib/utils";

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
    return { title: "Accept this order", note: "Check that you can make it now, then accept it." };
  }
  if (status === "VENDOR_ACCEPTED") {
    return { title: "Start preparing", note: "Tap Start preparing when you begin making it." };
  }
  if (status === "PREPARING") {
    return {
      title: "Finish and call the rider",
      note: "Mark it ready only when it is packed for collection.",
    };
  }
  if (status === "READY_FOR_PICKUP") {
    return { title: "Waiting for rider", note: "Keep the order packed and ready for collection." };
  }
  if (["RIDER_ASSIGNED", "PICKED_UP", "ON_THE_WAY"].includes(status)) {
    return {
      title: "Delivery in progress",
      note: "The map shows the rider when live tracking is available.",
    };
  }
  if (status === "DELIVERED") {
    return { title: "Order complete", note: "Nothing more to do." };
  }
  if (EXCEPTION_STATUSES.includes(status)) {
    return {
      title: "Check this order",
      note: "Keep the order number handy if you contact support.",
    };
  }
  return { title: "Waiting for payment", note: "You can act on it once payment is confirmed." };
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

function rands(cents: number) {
  return `R${(cents / 100).toFixed(2)}`;
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

/** Label and value for delivery details; long values wrap instead of being cut off. */
function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-words font-medium text-slate-900">{value}</dd>
    </div>
  );
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

  const priorityNeedsAction = priorityOrder
    ? ACTION_STATUSES.includes(priorityOrder.status)
    : false;
  // The open order's details (and any error from its buttons) show inside its row.
  const detailsShown =
    !loading &&
    selectedOrder !== null &&
    filteredOrders.some((order) => order.publicId === selectedOrder.publicId);

  const refreshButton = (
    <button
      type="button"
      onClick={() => load(false)}
      disabled={refreshing}
      className={cn(dashButton.secondary, "shrink-0")}
    >
      <RefreshCw className={refreshing ? "animate-spin" : undefined} aria-hidden="true" />
      {refreshing ? "Refreshing..." : "Refresh"}
    </button>
  );

  return (
    <div className="space-y-4">
      {!loading && priorityOrder ? (
        <section
          className={cn(
            "flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
            priorityNeedsAction
              ? "border-lethela-primary/30 bg-lethela-primary/[0.04]"
              : "border-slate-200 bg-white",
          )}
        >
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm font-medium",
                priorityNeedsAction ? "text-lethela-primary" : "text-slate-500",
              )}
            >
              Next action
            </p>
            <p className="mt-1 text-[15px] font-semibold text-slate-900">
              {priorityNeedsAction
                ? `${workflowCounts.ACTION} order${workflowCounts.ACTION === 1 ? " needs" : "s need"} your action`
                : `${workflowCounts.DELIVERY} order${workflowCounts.DELIVERY === 1 ? "" : "s"} in delivery`}
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              {workflowGuidance(priorityOrder.status).title}:{" "}
              <span className="font-semibold text-slate-900">{priorityOrder.publicId}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const nextFilter = ACTION_STATUSES.includes(priorityOrder.status)
                ? "ACTION"
                : "DELIVERY";
              setFilter(nextFilter);
              setSelectedId(priorityOrder.publicId);
            }}
            className={cn(
              priorityNeedsAction ? dashButton.primary : dashButton.secondary,
              "w-full sm:w-auto",
            )}
          >
            Open priority order
          </button>
        </section>
      ) : !loading && orders.length > 0 ? (
        <Notice title="No orders need your action right now">
          New orders move to the top of the list.
        </Notice>
      ) : null}

      {error && !detailsShown ? <Notice tone="danger">{error}</Notice> : null}

      <Panel padded={false}>
        {loading ? (
          <div className="grid animate-pulse gap-3 p-4 sm:p-5" aria-hidden="true">
            <div className="h-20 rounded-lg bg-slate-100" />
            <div className="h-20 rounded-lg bg-slate-100" />
            <div className="h-20 rounded-lg bg-slate-100" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            compact
            icon={<ShoppingBag />}
            title={error ? "Orders could not load" : "No orders yet"}
            text="When a customer orders from you, the order shows here."
            action={refreshButton}
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:p-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <FilterTabs
                  label="Order workflow filters"
                  options={WORKFLOW_FILTERS.map((item) => ({
                    value: item.value,
                    label: item.label,
                    count: workflowCounts[item.value],
                  }))}
                  value={filter}
                  onChange={setFilter}
                />
              </div>
              <div className="flex min-w-0 items-center gap-2 xl:w-80 xl:shrink-0">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Order, name or item"
                    aria-label="Search orders"
                    className={cn(dashField.input, "pl-9")}
                  />
                </div>
                {refreshButton}
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <EmptyState
                compact
                title="No orders here"
                text="Choose another view or clear the search."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const driver = tracking[order.publicId];
                  const isSelected = selectedId === order.publicId;
                  const isNew = order.status === "NEW";
                  const needsAction = ACTION_STATUSES.includes(order.status);
                  const guidance = workflowGuidance(order.status);

                  return (
                    <li key={order.publicId} className="relative">
                      {isSelected ? (
                        <span
                          className="absolute inset-y-0 left-0 w-1 bg-lethela-primary"
                          aria-hidden="true"
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setSelectedId(order.publicId)}
                        aria-current={isSelected ? "true" : undefined}
                        className={cn(
                          "block w-full px-4 py-4 text-left transition-colors sm:px-5",
                          isNew && !isSelected
                            ? "bg-lethela-primary/[0.04] hover:bg-lethela-primary/[0.07]"
                            : "hover:bg-slate-50",
                        )}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-[15px] font-semibold text-slate-900">
                                {order.publicId}
                              </span>
                              <StatusBadge tone={isNew ? "brand" : toneForStatus(order.status)}>
                                {statusText(order.status)}
                              </StatusBadge>
                            </span>
                            <span className="mt-1 block text-sm text-slate-700">
                              {order.items.map((item, index) => (
                                <span key={item.id}>
                                  {item.qty} × {item.product?.name ?? "Item"}
                                  {index < order.items.length - 1 ? ", " : ""}
                                </span>
                              ))}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500">
                              {formatWhen(order.createdAt)} · Payment:{" "}
                              {statusText(order.paymentStatus)}
                            </span>
                          </span>
                          <span className="shrink-0 text-[15px] font-semibold tabular-nums text-slate-900">
                            {rands(order.totalCents)}
                          </span>
                        </span>

                        {!isSelected ? (
                          <span
                            className={cn(
                              "mt-2 flex items-center gap-1 text-sm font-medium",
                              needsAction ? "text-lethela-primary" : "text-slate-600",
                            )}
                          >
                            {guidance.title}
                            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                          </span>
                        ) : null}

                        {driver ? (
                          <span className="mt-3 block">
                            <ProgressBar
                              value={driver.progress * 100}
                              label={`Delivery progress for ${order.publicId}`}
                            />
                          </span>
                        ) : null}
                      </button>

                      {isSelected && selectedOrder ? (
                        <div className="space-y-4 px-4 pb-5 sm:px-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-[15px] font-semibold text-slate-900">
                                {workflowGuidance(selectedOrder.status).title}
                              </p>
                              <p className="mt-0.5 text-sm text-slate-500">
                                {workflowGuidance(selectedOrder.status).note}
                              </p>
                            </div>
                            {vendorActions(selectedOrder.status).length > 0 ? (
                              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                                {vendorActions(selectedOrder.status).map((status, index) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() =>
                                      void updateStatus(selectedOrder.publicId, status)
                                    }
                                    className={
                                      status === "CANCELLED"
                                        ? dashButton.danger
                                        : index === 0
                                          ? dashButton.primary
                                          : dashButton.secondary
                                    }
                                  >
                                    {status === "CANCELLED" && selectedOrder.status === "NEW"
                                      ? "Decline"
                                      : actionLabel(status)}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          {error ? <Notice tone="danger">{error}</Notice> : null}

                          {selectedOrder.deliveryDetails?.containsAlcohol ? (
                            <Notice tone="warning">Liquor order — ID check required.</Notice>
                          ) : null}

                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-4">
                              <section>
                                <h3 className="text-sm font-semibold text-slate-900">Items</h3>
                                <ul className="mt-2 divide-y divide-slate-200/70 rounded-lg bg-slate-50 px-3 text-sm">
                                  {selectedOrder.items.map((item) => (
                                    <li key={item.id} className="flex gap-3 py-2.5">
                                      <span className="w-8 shrink-0 font-semibold tabular-nums text-slate-900">
                                        {item.qty}×
                                      </span>
                                      <span className="min-w-0 text-slate-700">
                                        {item.product?.name ?? "Item"}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </section>

                              <section>
                                <h3 className="text-sm font-semibold text-slate-900">Money</h3>
                                <div className="mt-2 divide-y divide-slate-200/70 rounded-lg bg-slate-50 px-3">
                                  <DetailRow
                                    label="Subtotal"
                                    value={rands(selectedOrder.subtotalCents)}
                                  />
                                  <DetailRow
                                    label="Rider delivery fee"
                                    value={rands(selectedOrder.deliveryFeeCents)}
                                  />
                                  <DetailRow
                                    label="Rider tip"
                                    value={rands(selectedOrder.deliveryDetails?.riderTipCents || 0)}
                                  />
                                  <DetailRow
                                    label="Rider payout"
                                    value={rands(
                                      selectedOrder.deliveryDetails?.riderPayoutCents ||
                                        selectedOrder.deliveryFeeCents,
                                    )}
                                  />
                                  <DetailRow
                                    label="Total paid"
                                    value={rands(selectedOrder.totalCents)}
                                  />
                                  <DetailRow
                                    label="Payment"
                                    value={statusText(selectedOrder.paymentStatus)}
                                  />
                                </div>
                              </section>
                            </div>

                            <div className="space-y-4">
                              <section>
                                <h3 className="text-sm font-semibold text-slate-900">Delivery</h3>
                                {selectedOrder.deliveryDetails ? (
                                  <dl className="mt-2 divide-y divide-slate-200/70 rounded-lg bg-slate-50 px-3 text-sm">
                                    <InfoRow
                                      label="Name"
                                      value={
                                        selectedOrder.deliveryDetails.customerName || "Not supplied"
                                      }
                                    />
                                    <InfoRow
                                      label="Phone"
                                      value={
                                        selectedOrder.deliveryDetails.customerPhone ||
                                        selectedOrder.deliveryDetails.whatsappNumber ||
                                        "Not supplied"
                                      }
                                    />
                                    <InfoRow
                                      label="Address"
                                      value={
                                        [
                                          selectedOrder.deliveryDetails.standNumber,
                                          selectedOrder.deliveryDetails.streetSection,
                                          selectedOrder.deliveryDetails.destinationSuburb,
                                        ]
                                          .filter(Boolean)
                                          .join(", ") || "Not supplied"
                                      }
                                    />
                                    {selectedOrder.deliveryDetails.landmark ? (
                                      <InfoRow
                                        label="Landmark"
                                        value={selectedOrder.deliveryDetails.landmark}
                                      />
                                    ) : null}
                                    {selectedOrder.deliveryDetails.deliveryNotes ? (
                                      <InfoRow
                                        label="Notes"
                                        value={selectedOrder.deliveryDetails.deliveryNotes}
                                      />
                                    ) : null}
                                    {selectedOrder.deliveryDetails.deliveryDistanceKm != null ? (
                                      <InfoRow
                                        label="Distance"
                                        value={`${Number(selectedOrder.deliveryDetails.deliveryDistanceKm).toFixed(2)} km`}
                                      />
                                    ) : null}
                                  </dl>
                                ) : (
                                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                                    No delivery notes were captured.
                                  </p>
                                )}
                              </section>

                              {selectedOrder.customerLat != null &&
                              selectedOrder.customerLng != null ? (
                                // Navy frame: the map's legend uses light text.
                                <div className="overflow-hidden rounded-lg bg-lethela-secondary text-white">
                                  <OrderMap
                                    compact
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
                                </div>
                              ) : (
                                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                                  No map for this order yet. It shows once the delivery location is
                                  known.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
