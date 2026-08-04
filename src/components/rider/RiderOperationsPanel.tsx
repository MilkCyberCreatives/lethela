"use client";

import { useEffect, useState } from "react";
import { Bike, CircleDollarSign, Clock3, Power } from "lucide-react";

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
    ["Today", earnings?.today, Clock3],
    ["This week", earnings?.week, Bike],
    ["This month", earnings?.month, CircleDollarSign],
  ] as const;

  return (
    <section className="grid gap-4 lg:grid-cols-[0.8fr,1.2fr]">
      <article className="rounded-xl border border-white/10 bg-[#0C1132] p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
              Shift status
            </p>
            <h3 className="mt-2 text-lg font-semibold">
              {availability?.availableNow ? "Online for delivery" : "Offline"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/62">
              {availability?.approved
                ? `Dispatch area: ${availability.area || "complete your area in the profile"}.`
                : "Lethela approval is required before a rider can go online."}
            </p>
          </div>
          <span
            className={`grid h-11 w-11 place-items-center rounded-xl ${
              availability?.availableNow
                ? "bg-emerald-300/15 text-emerald-200"
                : "bg-white/8 text-white/55"
            }`}
          >
            <Power className="h-5 w-5" />
          </span>
        </div>
        <button
          type="button"
          disabled={loading || saving || !availability?.approved}
          onClick={() => void toggleAvailability()}
          className={`mt-5 w-full rounded-lg px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
            availability?.availableNow
              ? "border border-white/20 bg-transparent text-white hover:border-red-300/60"
              : "bg-lethela-primary text-white hover:opacity-90"
          }`}
        >
          {saving
            ? "Updating..."
            : availability?.availableNow
              ? "Go offline"
              : "Go online for deliveries"}
        </button>
        {error ? <p className="mt-3 text-xs text-red-200">{error}</p> : null}
      </article>

      <article className="rounded-xl border border-white/10 bg-[#0C1132] p-5 text-white">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
            Completed earnings
          </p>
          <h3 className="mt-2 text-lg font-semibold">Delivery fee and tip summary</h3>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {periods.map(([label, period, Icon]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-white/55">{label}</span>
                <Icon className="h-4 w-4 text-lethela-primary" />
              </div>
              <p className="mt-2 text-xl font-bold">{money(period?.totalCents || 0)}</p>
              <p className="mt-1 text-[11px] text-white/50">
                {period?.deliveries || 0} delivery{period?.deliveries === 1 ? "" : "ies"} · Tips{" "}
                {money(period?.tipCents || 0)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-white/52">
          {earnings?.settlementNote ||
            "Completed earnings appear here after delivered, paid orders are reconciled."}
        </p>
      </article>
    </section>
  );
}
