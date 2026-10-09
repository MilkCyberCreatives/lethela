"use client";

import { useEffect, useState } from "react";
import { Power } from "lucide-react";
import { dashButton } from "@/components/dashboard/kit/ui";

function money(cents: number) {
  return `R ${(Number(cents || 0) / 100).toFixed(2)}`;
}

type AvailabilityResponse = {
  ok?: boolean;
  error?: string;
  availableNow?: boolean;
  approved?: boolean;
  area?: string | null;
};

type EarningsPeriod = {
  totalCents: number;
  deliveryCents: number;
  tipCents: number;
  deliveries: number;
};

type EarningsResponse = {
  ok?: boolean;
  error?: string;
  today?: EarningsPeriod;
  week?: EarningsPeriod;
  month?: EarningsPeriod;
  settlementNote?: string;
};

export default function RiderOperationsPanel() {
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [availabilityResponse, earningsResponse] = await Promise.all([
        fetch("/api/riders/me/availability", { cache: "no-store" }),
        fetch("/api/riders/me/earnings", { cache: "no-store" }),
      ]);
      const availabilityJson = await availabilityResponse.json().catch(() => ({}));
      const earningsJson = await earningsResponse.json().catch(() => ({}));
      setAvailability(availabilityJson);
      setEarnings(earningsJson);
    } catch {
      setError("We could not load shift and earnings information.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleAvailability() {
    if (!availability?.approved) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/riders/me/availability", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ availableNow: !availability.availableNow }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error || "Could not update your shift status.");
      }
      setAvailability((current) => ({
        ...current,
        ok: true,
        approved: true,
        availableNow: Boolean(json.availableNow),
        area: json.area || current?.area || null,
      }));
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "Could not update your shift status.",
      );
    } finally {
      setSaving(false);
    }
  }

  const periods = [
    ["Today", earnings?.today],
    ["This week", earnings?.week],
    ["This month", earnings?.month],
  ] as const;
  const online = Boolean(availability?.availableNow);

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
              online ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
            aria-hidden="true"
          >
            <Power className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-slate-900">
              {loading ? "Checking your shift…" : online ? "You are online" : "You are offline"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {loading
                ? "One moment."
                : availability?.approved
                  ? `Area: ${availability.area || "add your area in your profile"}`
                  : "You can go online once Lethela approves you."}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={loading || saving || !availability?.approved}
          onClick={() => void toggleAvailability()}
          className={`mt-5 ${online ? dashButton.secondary : dashButton.primary} min-h-12 w-full text-base`}
        >
          {saving ? "Updating…" : online ? "Go offline" : "Go online"}
        </button>
        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </article>

      <article className="rounded-xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <h2 className="text-[15px] font-semibold text-slate-900">Your earnings</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Delivery fees and tips from completed deliveries
          </p>
        </header>
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {periods.map(([label, period]) => (
            <div key={label} className="min-w-0 px-3 py-4 sm:px-5">
              <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
              <p className="mt-1 truncate text-lg font-semibold tabular-nums text-slate-900 sm:text-2xl">
                {money(period?.totalCents || 0)}
              </p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">
                {period?.deliveries || 0} {period?.deliveries === 1 ? "delivery" : "deliveries"}
                <span className="hidden sm:inline"> · tips {money(period?.tipCents || 0)}</span>
              </p>
            </div>
          ))}
        </div>
        <p className="border-t border-slate-100 px-4 py-3 text-xs leading-5 text-slate-500 sm:px-5">
          {earnings?.settlementNote ||
            "Earnings show here once a delivered order has been paid and checked."}
        </p>
      </article>
    </section>
  );
}
