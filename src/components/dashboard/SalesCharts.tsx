"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, Receipt, RefreshCw, ShoppingBag } from "lucide-react";
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
import {
  EmptyState,
  Notice,
  Panel,
  StatTile,
  StatusBadge,
  dashButton,
  statusText,
  toneForStatus,
} from "@/components/dashboard/kit/ui";
import { cn } from "@/lib/utils";

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

// Chart colours: Lethela red for the main series, slate for the secondary series and chrome.
const BRAND_RED = "#B5001B";
const SECONDARY_SLATE = "#64748b";
const GRID_COLOUR = "#f1f5f9";
const AXIS_TICK = { fill: "#64748b", fontSize: 12 };
const CHART_HEIGHT = "h-52 sm:h-60";

const WEEKDAY_NAMES: Record<string, string> = {
  Sun: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
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

// Chart values are in rand, not cents.
function rand(value: number) {
  return `R${value.toFixed(2)}`;
}

function randTick(value: number) {
  return Math.abs(value) >= 1000 ? `R${parseFloat((value / 1000).toFixed(2))}k` : `R${value}`;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function paymentText(status: string) {
  const value = String(status || "").toUpperCase();
  if (value === "PAID" || value === "SUCCESS") return "Paid";
  if (["PENDING", "AWAITING_PAYMENT", "PENDING_PAYMENT"].includes(value)) return "Not paid yet";
  return `Payment ${statusText(value).toLowerCase()}`;
}

type TooltipRow = { name?: string | number; value?: unknown; color?: string; dataKey?: unknown };

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: ReadonlyArray<TooltipRow>;
  label?: string | number;
  format: (value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
      <p className="font-medium text-slate-500">{label}</p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((row) => (
          <li key={String(row.dataKey ?? row.name)} className="flex items-center gap-2">
            <span
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
              aria-hidden="true"
            />
            <span className="font-semibold tabular-nums text-slate-900">
              {format(Number(row.value) || 0)}
            </span>
            <span className="text-slate-500">{row.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-sm"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
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
    const totalDeliveryFeeCents = data.series.reduce(
      (sum, point) => sum + point.deliveryFeeCents,
      0,
    );
    const avgOrderValueCents = totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0;
    const bestDay =
      [...data.series].sort((left, right) => right.revenueCents - left.revenueCents)[0] || null;
    const weakestDay =
      [...data.series]
        .filter((point) => point.orders > 0)
        .sort((left, right) => left.revenueCents - right.revenueCents)[0] || null;

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
    [data.series],
  );

  const weekdayData = useMemo(
    () =>
      data.weekdaySeries.map((point) => ({
        ...point,
        revenue: point.revenueCents / 100,
        avgOrder: point.avgOrderCents / 100,
      })),
    [data.weekdaySeries],
  );

  // The first load shows placeholders; a refresh keeps the last numbers on screen.
  const hasLoaded = data.series.length > 0;
  const firstLoad = loading && !hasLoaded;
  const noOrders = hasLoaded && metrics.totalOrders === 0;
  const hasBestDay = Boolean(metrics.bestDay && metrics.bestDay.revenueCents > 0);
  const show = (value: string) => (firstLoad ? "…" : value);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Last 30 days</p>
        <button type="button" onClick={load} disabled={loading} className={dashButton.secondary}>
          <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : undefined} />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {hasLoaded || loading ? (
        <div
          className={cn(
            "grid grid-cols-2 gap-3 transition-opacity lg:grid-cols-4 lg:gap-4",
            loading && !firstLoad ? "opacity-60" : "",
          )}
          aria-busy={loading}
        >
          <StatTile
            label="Sales"
            value={show(money(metrics.totalRevenueCents))}
            hint={
              firstLoad ? undefined : (
                <>
                  Food {money(metrics.totalSubtotalCents)}
                  <br />
                  Delivery {money(metrics.totalDeliveryFeeCents)}
                </>
              )
            }
            icon={<BarChart3 />}
          />
          <StatTile
            label="Orders"
            value={show(String(metrics.totalOrders))}
            hint={firstLoad ? undefined : `${data.paymentSummary.paidOrders} paid`}
            icon={<ShoppingBag />}
          />
          <StatTile
            label="Average order"
            value={show(money(metrics.avgOrderValueCents))}
            hint={firstLoad ? undefined : "Per order"}
            icon={<Receipt />}
          />
          <StatTile
            label="Best day"
            value={show(
              hasBestDay && metrics.bestDay ? formatShortDate(metrics.bestDay.date) : "—",
            )}
            hint={
              firstLoad
                ? undefined
                : !hasBestDay
                  ? "No sales yet"
                  : metrics.weakestDay
                    ? `Quietest: ${formatShortDate(metrics.weakestDay.date)}`
                    : undefined
            }
            icon={<CalendarDays />}
          />
        </div>
      ) : null}

      {firstLoad ? (
        <div className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
          <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
          <div className="hidden h-72 animate-pulse rounded-xl border border-slate-200 bg-white lg:block" />
        </div>
      ) : null}

      {noOrders ? (
        <EmptyState
          icon={<BarChart3 />}
          title="No orders in the last 30 days"
          text="Your sales charts show here once customers start ordering."
        />
      ) : null}

      {hasLoaded && !noOrders ? (
        <div
          className={cn("space-y-4 transition-opacity sm:space-y-6", loading ? "opacity-60" : "")}
          aria-busy={loading}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <DashCard title="Sales per day" description="Including delivery fees">
              <div className={CHART_HEIGHT}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRID_COLOUR} />
                    <XAxis
                      dataKey="shortDate"
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={28}
                      tickMargin={8}
                    />
                    <YAxis
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                      tickFormatter={randTick}
                    />
                    <Tooltip
                      cursor={{ stroke: "#cbd5e1" }}
                      content={(props) => (
                        <ChartTooltip
                          active={props.active}
                          payload={props.payload}
                          label={props.label}
                          format={rand}
                        />
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Sales"
                      stroke={BRAND_RED}
                      strokeWidth={2}
                      fill={BRAND_RED}
                      fillOpacity={0.1}
                      activeDot={{ r: 4, fill: BRAND_RED, stroke: "#ffffff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </DashCard>

            <DashCard title="Orders per day" description="All orders, paid or not">
              <div className={CHART_HEIGHT}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRID_COLOUR} />
                    <XAxis
                      dataKey="shortDate"
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={28}
                      tickMargin={8}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      content={(props) => (
                        <ChartTooltip
                          active={props.active}
                          payload={props.payload}
                          label={props.label}
                          format={(value) => String(value)}
                        />
                      )}
                    />
                    <Bar
                      dataKey="orders"
                      name="Orders"
                      fill={BRAND_RED}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Panel title="Recent orders" padded={data.recentOrders.length === 0}>
              {data.recentOrders.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {data.recentOrders.map((order) => (
                    <li key={order.publicId} className="px-4 py-3 sm:px-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
                          {order.publicId}
                        </p>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                          {money(order.totalCents)}
                        </p>
                      </div>
                      <div className="mt-1 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <p className="text-xs text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          · {plural(order.itemsCount, "item")}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadge tone={toneForStatus(order.status)}>
                            {statusText(order.status)}
                          </StatusBadge>
                          <StatusBadge tone={toneForStatus(order.paymentStatus)}>
                            {paymentText(order.paymentStatus)}
                          </StatusBadge>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact title="No recent orders" />
              )}
            </Panel>

            <div className="grid gap-4">
              <Panel title="Customer payments" padded={false}>
                <ul className="divide-y divide-slate-100">
                  <PaymentRow
                    label="Paid"
                    count={data.paymentSummary.paidOrders}
                    amount={data.paymentSummary.paidRevenueCents}
                    tone="success"
                  />
                  <PaymentRow
                    label="Not paid yet"
                    count={data.paymentSummary.pendingOrders}
                    amount={data.paymentSummary.pendingRevenueCents}
                    tone="warning"
                  />
                  <PaymentRow
                    label="Failed or cancelled"
                    count={data.paymentSummary.failedOrders}
                    amount={data.paymentSummary.failedRevenueCents}
                    tone="danger"
                  />
                </ul>
              </Panel>

              <Panel
                title="Busiest days"
                description="Sales by day of the week"
                padded={weekdayData.length === 0}
                className="overflow-hidden"
              >
                {weekdayData.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th scope="col" className="px-4 py-2.5 sm:px-5">
                          Day
                        </th>
                        <th scope="col" className="px-3 py-2.5">
                          <span className="block text-right">Orders</span>
                        </th>
                        <th scope="col" className="px-3 py-2.5">
                          <span className="block text-right">Sales</span>
                        </th>
                        <th scope="col" className="px-4 py-2.5 sm:px-5">
                          <span className="block text-right">Average</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekdayData
                        .sort((left, right) => right.revenueCents - left.revenueCents)
                        .map((point) => (
                          <tr key={point.weekday}>
                            <td className="px-4 py-2.5 font-medium sm:px-5">
                              {WEEKDAY_NAMES[point.weekday] ?? point.weekday}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              <span className="text-slate-600">{point.orders}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {money(point.revenueCents)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums sm:px-5">
                              <span className="text-slate-600">{money(point.avgOrderCents)}</span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState compact title="No sales yet" />
                )}
              </Panel>
            </div>
          </div>

          <DashCard title="Food and delivery fees" description="Per day, last 14 days">
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <LegendKey color={BRAND_RED} label="Food" />
              <LegendKey color={SECONDARY_SLATE} label="Delivery fees" />
            </div>
            <div className={CHART_HEIGHT}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.slice(-14)}
                  margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                >
                  <CartesianGrid vertical={false} stroke={GRID_COLOUR} />
                  <XAxis
                    dataKey="shortDate"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                    tickMargin={8}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickFormatter={randTick}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    content={(props) => (
                      <ChartTooltip
                        active={props.active}
                        payload={props.payload}
                        label={props.label}
                        format={rand}
                      />
                    )}
                  />
                  <Bar
                    dataKey="subtotal"
                    name="Food"
                    stackId="sales"
                    fill={BRAND_RED}
                    stroke="#ffffff"
                    strokeWidth={1}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="deliveryFees"
                    name="Delivery fees"
                    stackId="sales"
                    fill={SECONDARY_SLATE}
                    stroke="#ffffff"
                    strokeWidth={1}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DashCard>
        </div>
      ) : null}
    </div>
  );
}

function PaymentRow({
  label,
  count,
  amount,
  tone,
}: {
  label: string;
  count: number;
  amount: number;
  tone: "success" | "warning" | "danger";
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <StatusBadge tone={tone}>{label}</StatusBadge>
        <span className="text-xs text-slate-500">{plural(count, "order")}</span>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
        {money(amount)}
      </span>
    </li>
  );
}
