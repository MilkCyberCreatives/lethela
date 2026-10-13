"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CalendarDays, Hourglass, RefreshCw, Wallet } from "lucide-react";
import {
  DetailRow,
  EmptyState,
  Notice,
  Panel,
  StatTile,
  dashButton,
} from "@/components/dashboard/kit/ui";
import { cn } from "@/lib/utils";

type Settlement = {
  publicId: string;
  createdAt: string;
  amountCents: number;
  deliveryFeeCents: number;
  riderTipCents: number;
  riderPayoutCents: number;
  totalPaidCents: number;
  itemsCount: number;
};

type PayoutsPayload = {
  availableCents: number;
  pendingCents: number;
  failedCents: number;
  last7DaysCents: number;
  averagePaidOrderCents: number;
  riderDeliveryFeeCents: number;
  riderTipCents: number;
  riderPayoutCents: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  failedOrdersCount: number;
  nextEstimatedPayoutAt: string;
  latestPaidAt: string | null;
  recentSettlements: Settlement[];
};

function money(cents: number) {
  return `R${(cents / 100).toFixed(2)}`;
}

function shortDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PayoutsPanel() {
  const [payouts, setPayouts] = useState<PayoutsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/vendors/operations", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load settlement data.");
      }
      setPayouts(json.payouts);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load settlement data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // The first load shows placeholders; a refresh keeps the last numbers on screen.
  const firstLoad = loading && !payouts;
  const amount = (cents: number | undefined) => (firstLoad ? "…" : money(cents ?? 0));
  const nextPayout = payouts ? new Date(payouts.nextEstimatedPayoutAt) : null;

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

      {payouts || loading ? (
        <>
          <div
            className={cn(
              "grid grid-cols-2 gap-3 transition-opacity lg:grid-cols-4 lg:gap-4",
              loading && !firstLoad ? "opacity-60" : "",
            )}
            aria-busy={loading}
          >
            <StatTile
              label="Owed to you"
              value={amount(payouts?.availableCents)}
              hint="Delivered and paid"
              icon={<Wallet />}
            />
            <StatTile
              label="Waiting"
              value={amount(payouts?.pendingCents)}
              hint="Paid, not delivered yet"
              icon={<Hourglass />}
            />
            <StatTile
              label="Last 7 days"
              value={amount(payouts?.last7DaysCents)}
              hint="Your share of paid orders"
              icon={<CalendarDays />}
            />
            <StatTile
              label="Next payout"
              value={
                nextPayout
                  ? nextPayout.toLocaleDateString(undefined, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  : loading
                    ? "…"
                    : "—"
              }
              hint={
                nextPayout
                  ? `Estimated, ${nextPayout.toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : undefined
              }
              icon={<CalendarClock />}
            />
          </div>

          <div
            className={cn(
              "grid items-start gap-4 transition-opacity lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]",
              loading && !firstLoad ? "opacity-60" : "",
            )}
          >
            <Panel title="Payout summary">
              {firstLoad ? (
                <div className="grid animate-pulse gap-3" aria-hidden="true">
                  <div className="h-5 rounded bg-slate-100" />
                  <div className="h-5 rounded bg-slate-100" />
                  <div className="h-5 rounded bg-slate-100" />
                </div>
              ) : (
                <div className="-my-2.5 divide-y divide-slate-100">
                  <DetailRow label="Orders paid out" value={payouts?.paidOrdersCount ?? 0} />
                  <DetailRow
                    label="Waiting for delivery"
                    value={payouts?.pendingOrdersCount ?? 0}
                  />
                  <DetailRow label="Failed or cancelled" value={payouts?.failedOrdersCount ?? 0} />
                  <DetailRow
                    label="Last payout"
                    value={payouts?.latestPaidAt ? shortDateTime(payouts.latestPaidAt) : "None yet"}
                  />
                  <DetailRow
                    label="Delivery fees, to riders"
                    value={money(payouts?.riderDeliveryFeeCents ?? 0)}
                  />
                  <DetailRow label="Tips, to riders" value={money(payouts?.riderTipCents ?? 0)} />
                </div>
              )}
              <p className="mt-5 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                Lethela keeps 2% of your food sales and pays you the rest. Delivery fees and tips go
                to the rider.
              </p>
            </Panel>

            <Panel
              title="Recent paid orders"
              description="Delivered orders and what you get"
              padded={!firstLoad && !(payouts && payouts.recentSettlements.length > 0)}
            >
              {firstLoad ? (
                <div className="grid animate-pulse gap-2 p-4 sm:p-5" aria-hidden="true">
                  <div className="h-10 rounded-lg bg-slate-100" />
                  <div className="h-10 rounded-lg bg-slate-100" />
                  <div className="h-10 rounded-lg bg-slate-100" />
                </div>
              ) : payouts && payouts.recentSettlements.length > 0 ? (
                <>
                  <div className="flex justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 sm:px-5">
                    <span>Order</span>
                    <span>You get</span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {payouts.recentSettlements.map((settlement) => (
                      <li
                        key={settlement.publicId}
                        className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {settlement.publicId}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {shortDateTime(settlement.createdAt)} · {settlement.itemsCount} item
                            {settlement.itemsCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums text-slate-900">
                            {money(settlement.amountCents)}
                          </p>
                          <p className="mt-0.5 text-xs tabular-nums text-slate-500">
                            Rider {money(settlement.riderPayoutCents)} · Total{" "}
                            {money(settlement.totalPaidCents)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <EmptyState
                  compact
                  icon={<Wallet />}
                  title="No paid orders yet"
                  text="Orders show here once they are paid and delivered."
                />
              )}
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}
