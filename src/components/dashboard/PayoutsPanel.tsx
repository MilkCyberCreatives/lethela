"use client";

import { useEffect, useState } from "react";
import DashCard from "./DashCard";

type Settlement = {
  publicId: string;
  createdAt: string;
  amountCents: number;
  itemsCount: number;
};

type PayoutsPayload = {
  availableCents: number;
  pendingCents: number;
  failedCents: number;
  last7DaysCents: number;
  averagePaidOrderCents: number;
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

  return (
    <div className="grid gap-4">
      <DashCard title="Payouts and Settlements">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/70">
            Estimated settlement visibility from live paid and pending orders.
          </p>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded border border-white/20 px-3 py-2 text-xs transition-colors hover:border-lethela-primary hover:text-lethela-primary disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {error ? <p className="mt-3 text-xs text-red-200">{error}</p> : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Available" value={loading ? "..." : money(payouts?.availableCents ?? 0)} />
          <StatCard label="Pending" value={loading ? "..." : money(payouts?.pendingCents ?? 0)} />
          <StatCard label="Failed" value={loading ? "..." : money(payouts?.failedCents ?? 0)} />
          <StatCard label="Last 7 days" value={loading ? "..." : money(payouts?.last7DaysCents ?? 0)} />
          <StatCard label="Avg paid order" value={loading ? "..." : money(payouts?.averagePaidOrderCents ?? 0)} />
        </div>
      </DashCard>

      <div className="grid gap-4 xl:grid-cols-[0.85fr,1.15fr]">
        <DashCard title="Settlement Status">
          <div className="space-y-3">
            <StatusRow label="Paid and ready" count={payouts?.paidOrdersCount ?? 0} />
            <StatusRow label="Pending settlement" count={payouts?.pendingOrdersCount ?? 0} />
            <StatusRow label="Failed or cancelled" count={payouts?.failedOrdersCount ?? 0} />
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/15 px-4 py-4 text-sm">
            <div className="text-xs uppercase tracking-[0.12em] text-white/55">Next estimated payout</div>
            <div className="mt-2 text-lg font-semibold text-white">
              {loading || !payouts ? "..." : new Date(payouts.nextEstimatedPayoutAt).toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-white/60">
              {payouts?.latestPaidAt
                ? `Latest paid order: ${new Date(payouts.latestPaidAt).toLocaleString()}`
                : "No paid orders yet."}
            </div>
          </div>
        </DashCard>

        <DashCard title="Recent Settled Orders">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-white/55">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Order</th>
                  <th className="pb-3 pr-4 font-medium">Time</th>
                  <th className="pb-3 pr-4 font-medium">Items</th>
                  <th className="pb-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="border-t border-white/10">
                    <td colSpan={4} className="py-6 text-center text-white/60">
                      Loading settlements...
                    </td>
                  </tr>
                ) : payouts && payouts.recentSettlements.length > 0 ? (
                  payouts.recentSettlements.map((settlement) => (
                    <tr key={settlement.publicId} className="border-t border-white/10">
                      <td className="py-3 pr-4 font-medium text-white/88">{settlement.publicId}</td>
                      <td className="py-3 pr-4 text-white/65">
                        {new Date(settlement.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-white/65">{settlement.itemsCount}</td>
                      <td className="py-3 font-semibold text-white">{money(settlement.amountCents)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-white/10">
                    <td colSpan={4} className="py-6 text-center text-white/60">
                      No paid orders to settle yet.
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
      <div className="text-xs uppercase tracking-[0.12em] text-white/55">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

function StatusRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
      <span className="text-white/78">{label}</span>
      <span className="font-semibold text-white">{count}</span>
    </div>
  );
}
