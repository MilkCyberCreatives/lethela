"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashCard from "./DashCard";

type Point = {
  date: string;
  orders: number;
  revenueCents: number;
  subtotalCents: number;
  deliveryFeeCents: number;
  paidRevenueCents: number;
  pendingRevenueCents: number;
};

type WeekdayPoint = {
  weekday: string;
  orders: number;
  revenueCents: number;
  avgOrderCents: number;
};

type RecentOrder = {
  publicId: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  itemsCount: number;
};

type PaymentSummary = {
  paidOrders: number;
  pendingOrders: number;
  failedOrders: number;
  paidRevenueCents: number;
  pendingRevenueCents: number;
  failedRevenueCents: number;
};

type AnalyticsPayload = {
  series: Point[];
  weekdaySeries: WeekdayPoint[];
  recentOrders: RecentOrder[];
  paymentSummary: PaymentSummary;
};

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function money(cents: number) {
  return `R${(cents / 100).toFixed(2)}`;
}

function statusTone(value: string) {
  const upper = String(value || "").toUpperCase();
  if (upper === "PAID" || upper === "SUCCESS" || upper === "DELIVERED") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-100";
  }
  if (upper === "FAILED" || upper === "CANCELLED") {
    return "border-red-300/20 bg-red-300/10 text-red-100";
  }
  return "border-amber-300/20 bg-amber-300/10 text-amber-100";
}

export default function SalesCharts() {
  const [data, setData] = useState<AnalyticsPayload>({
    series: [],
    weekdaySeries: [],
    recentOrders: [],
    paymentSummary: {
      paidOrders: 0,
      pendingOrders: 0,
      failedOrders: 0,
      paidRevenueCents: 0,
      pendingRevenueCents: 0,
      failedRevenueCents: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/vendors/analytics", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load analytics.");
      }
      setData({
        series: json.series || [],
        weekdaySeries: json.weekdaySeries || [],
        recentOrders: json.recentOrders || [],
        paymentSummary: json.paymentSummary || {
          paidOrders: 0,
          pendingOrders: 0,
          failedOrders: 0,
          paidRevenueCents: 0,
          pendingRevenueCents: 0,
          failedRevenueCents: 0,
        },
      });
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const metrics = useMemo(() => {
    const totalOrders = data.series.reduce((sum, point) => sum + point.orders, 0);
    const totalRevenueCents = data.series.reduce((sum, point) => sum + point.revenueCents, 0);
    const totalSubtotalCents = data.series.reduce((sum, point) => sum + point.subtotalCents, 0);
    const totalDeliveryFeeCents = data.series.reduce((sum, point) => sum + point.deliveryFeeCents, 0);
    const avgOrderValueCents = totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0;
    const bestDay =
      [...data.series].sort((left, right) => right.revenueCents - left.revenueCents)[0] || null;
    const weakestDay =
      [...data.series].filter((point) => point.orders > 0).sort((left, right) => left.revenueCents - right.revenueCents)[0] || null;

    return {
      totalOrders,
      totalRevenueCents,
      totalSubtotalCents,
      totalDeliveryFeeCents,
      avgOrderValueCents,
      bestDay,
      weakestDay,
    };
  }, [data.series]);

  const chartData = useMemo(
    () =>
      data.series.map((point) => ({
        ...point,
        shortDate: formatShortDate(point.date),
        revenue: point.revenueCents / 100,
        subtotal: point.subtotalCents / 100,
        deliveryFees: point.deliveryFeeCents / 100,
        paidRevenue: point.paidRevenueCents / 100,
        pendingRevenue: point.pendingRevenueCents / 100,
      })),
    [data.series]
  );

  const weekdayData = useMemo(
    () =>
      data.weekdaySeries.map((point) => ({
        ...point,
        revenue: point.revenueCents / 100,
        avgOrder: point.avgOrderCents / 100,
      })),
    [data.weekdaySeries]
  );

  return (
    <div className="grid gap-4">
      <DashCard title="Financial Snapshot">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="text-xs uppercase tracking-[0.12em] text-white/60">Orders</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {loading ? "..." : metrics.totalOrders}
              </div>
            </div>
            <div className="rounded-xl border border-lethela-primary/20 bg-lethela-primary/10 px-3 py-3">
              <div className="text-xs uppercase tracking-[0.12em] text-red-100/75">Gross sales</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {loading ? "..." : money(metrics.totalRevenueCents)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="text-xs uppercase tracking-[0.12em] text-white/60">Food subtotal</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {loading ? "..." : money(metrics.totalSubtotalCents)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="text-xs uppercase tracking-[0.12em] text-white/60">Delivery fees</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {loading ? "..." : money(metrics.totalDeliveryFeeCents)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="text-xs uppercase tracking-[0.12em] text-white/60">Avg order</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {loading ? "..." : money(metrics.avgOrderValueCents)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="text-xs uppercase tracking-[0.12em] text-white/60">Best day</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {loading ? "..." : metrics.bestDay ? formatShortDate(metrics.bestDay.date) : "No sales"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded border border-white/20 px-3 py-2 text-xs font-medium text-white transition-colors hover:border-lethela-primary hover:text-lethela-primary disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh analytics"}
          </button>
        </div>

        {error ? <p className="mt-3 text-xs text-red-200">{error}</p> : null}
      </DashCard>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <DashCard title="Gross Revenue (last 30 days)">
          <div className="mb-3 flex items-center justify-between text-xs text-white/60">
            <span>Track the sales line for the last 30 days.</span>
            <span>{loading ? "..." : money(metrics.totalRevenueCents)}</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="shortDate" hide />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b102d",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#B5001B" fill="rgba(181,0,27,0.22)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashCard>

        <DashCard title="Orders Volume">
          <div className="mb-3 flex items-center justify-between text-xs text-white/60">
            <span>Daily order count across the last 30 days.</span>
            <span>{loading ? "..." : `${metrics.totalOrders} total`}</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="shortDate" hide />
                <YAxis allowDecimals={false} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b102d",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="orders" fill="#ffffff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <DashCard title="Sales Mix">
          <div className="mb-3 flex items-center justify-between text-xs text-white/60">
            <span>Food subtotal versus delivery revenue.</span>
            <span>{loading ? "..." : metrics.weakestDay ? `Softest day ${formatShortDate(metrics.weakestDay.date)}` : "Awaiting sales"}</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(-14)}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="shortDate" hide />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b102d",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="subtotal" stackId="sales" fill="#ffffff" radius={[6, 6, 0, 0]} />
                <Bar dataKey="deliveryFees" stackId="sales" fill="#B5001B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashCard>

        <DashCard title="Collections Status">
          <div className="space-y-3">
            <FinanceRow
              label="Paid / successful"
              count={data.paymentSummary.paidOrders}
              amount={data.paymentSummary.paidRevenueCents}
              tone="border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
            />
            <FinanceRow
              label="Pending settlement"
              count={data.paymentSummary.pendingOrders}
              amount={data.paymentSummary.pendingRevenueCents}
              tone="border-amber-300/20 bg-amber-300/10 text-amber-100"
            />
            <FinanceRow
              label="Failed / cancelled"
              count={data.paymentSummary.failedOrders}
              amount={data.paymentSummary.failedRevenueCents}
              tone="border-red-300/20 bg-red-300/10 text-red-100"
            />
          </div>
        </DashCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
        <DashCard title="Best Trading Days">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-white/50">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Day</th>
                  <th className="pb-3 pr-4 font-medium">Orders</th>
                  <th className="pb-3 pr-4 font-medium">Revenue</th>
                  <th className="pb-3 font-medium">Avg order</th>
                </tr>
              </thead>
              <tbody>
                {weekdayData
                  .sort((left, right) => right.revenueCents - left.revenueCents)
                  .map((point) => (
                    <tr key={point.weekday} className="border-t border-white/10">
                      <td className="py-3 pr-4 font-medium text-white/88">{point.weekday}</td>
                      <td className="py-3 pr-4 text-white/68">{point.orders}</td>
                      <td className="py-3 pr-4 text-white/88">{money(point.revenueCents)}</td>
                      <td className="py-3 text-white/68">{money(point.avgOrderCents)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </DashCard>

        <DashCard title="Recent Transactions">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-white/50">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Order</th>
                  <th className="pb-3 pr-4 font-medium">Time</th>
                  <th className="pb-3 pr-4 font-medium">Items</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Payment</th>
                  <th className="pb-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.length > 0 ? (
                  data.recentOrders.map((order) => (
                    <tr key={order.publicId} className="border-t border-white/10">
                      <td className="py-3 pr-4 font-medium text-white/88">{order.publicId}</td>
                      <td className="py-3 pr-4 text-white/68">
                        {new Date(order.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 pr-4 text-white/68">{order.itemsCount}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusTone(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusTone(order.paymentStatus)}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-white">{money(order.totalCents)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-white/10">
                    <td colSpan={6} className="py-6 text-center text-white/60">
                      No recent transactions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DashCard>
      </div>
    </div>
  );
}

function FinanceRow({
  label,
  count,
  amount,
  tone,
}: {
  label: string;
  count: number;
  amount: number;
  tone: string;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.14em] opacity-75">{label}</div>
          <div className="mt-1 text-sm font-medium">{count} order(s)</div>
        </div>
        <div className="text-right text-lg font-semibold">{money(amount)}</div>
      </div>
    </div>
  );
}
