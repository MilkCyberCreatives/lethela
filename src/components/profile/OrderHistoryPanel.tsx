"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  LifeBuoy,
  LoaderCircle,
  PackageOpen,
  RefreshCcw,
  Search,
  Truck,
} from "lucide-react";
import { buildWhatsAppSupportLink } from "@/lib/support";

type OrderHistoryItem = {
  publicId: string;
  trackingRef: string;
  status: string;
  paymentStatus: string;
  totalCents: number;
  createdAt: string;
  vendor: { name: string; slug: string } | null;
  items: Array<{ id: string; qty: number; priceCents: number; name: string }>;
};

function money(cents: number) {
  return `R${(Number(cents || 0) / 100).toFixed(2)}`;
}

function statusLabel(value: string) {
  return String(value || "Pending")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClasses(value: string) {
  const normalized = String(value || "").toUpperCase();
  if (["DELIVERED", "COMPLETED", "PAID", "SUCCESS"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (["CANCELLED", "FAILED", "REFUNDED"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-800";
  }
  if (["OUT_FOR_DELIVERY", "READY", "PREPARING", "ACCEPTED"].includes(normalized)) {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export default function OrderHistoryPanel() {
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/me/orders", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed to load orders.");
      setOrders(json.orders || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethela-primary">
            Orders
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Order history</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            View recent purchases, open secure tracking and contact support with the correct order
            reference already included.
          </p>
        </div>
        <Link
          href="/search"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-lethela-primary hover:text-lethela-primary"
        >
          <Search className="h-4 w-4" />
          Browse marketplace
        </Link>
      </div>

      <div className="p-5 sm:p-6">
        {loading ? (
          <div className="grid gap-3" aria-label="Loading order history">
            {[0, 1].map((item) => (
              <div key={item} className="animate-pulse rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="h-5 w-40 rounded bg-slate-100" />
                  <div className="h-5 w-20 rounded bg-slate-100" />
                </div>
                <div className="mt-4 h-4 w-3/4 rounded bg-slate-100" />
                <div className="mt-4 h-11 w-48 rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
            <p className="font-semibold">Order history could not be loaded</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <RefreshCcw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-lethela-primary shadow-sm ring-1 ring-slate-200">
              <PackageOpen className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-slate-950">No account orders yet</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Orders placed while signed in will appear here. Guest and WhatsApp-assisted orders can
              still be tracked with their order reference and checkout phone number.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Link
                href="/search"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-lethela-primary px-5 py-2.5 text-sm font-semibold text-white"
              >
                Start browsing
              </Link>
              <Link
                href="/track"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
              >
                Track another order
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <article
                key={order.publicId}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-all text-base font-semibold text-slate-950">
                        {order.publicId}
                      </h3>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(order.status)}`}
                      >
                        {statusLabel(order.status)}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(order.paymentStatus)}`}
                      >
                        {statusLabel(order.paymentStatus)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
                      <span className="inline-flex items-center gap-2">
                        <Truck className="h-4 w-4 text-slate-400" />
                        {order.vendor?.name || "Vendor"}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        {new Date(order.createdAt).toLocaleString("en-ZA", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="mt-4 break-words text-sm leading-6 text-slate-700">
                      {order.items.map((item) => `${item.qty}× ${item.name}`).join(", ")}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 px-4 py-3 lg:min-w-32 lg:text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Total
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-950">
                      {money(order.totalCents)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:flex-wrap sm:px-5">
                  <Link
                    href={`/orders/${encodeURIComponent(order.trackingRef)}`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lethela-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    <LoaderCircle className="h-4 w-4" />
                    Open secure tracking
                  </Link>
                  <a
                    href={buildWhatsAppSupportLink(
                      `Hello Lethela, I need support with order ${order.trackingRef}.`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-lethela-primary hover:text-lethela-primary"
                  >
                    <LifeBuoy className="h-4 w-4" />
                    Get order support
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
