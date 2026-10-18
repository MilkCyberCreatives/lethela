"use client";

import { useEffect, useRef, useState } from "react";
import { Power } from "lucide-react";
import { dashButton } from "@/components/dashboard/kit/ui";

function money(cents: number) {
  return `R ${(Number(cents || 0) / 100).toFixed(2)}`;
}

type AvailabilityResponse = {
  ok?: boolean;
  error?: string;
  availableNow?: boolean;
  activeDelivery?: boolean;
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

  const online = Boolean(availability?.availableNow);
  const [delivering, setDelivering] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    setDelivering(Boolean(availability?.activeDelivery));
  }, [availability?.activeDelivery]);

  // A delivery can be given to the rider by an admin while they are offline, so
  // check now and then whether they have one.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/riders/me/availability", { cache: "no-store" })
        .then((response) => response.json())
        .then((json: AvailabilityResponse) => {
          if (json?.ok) setDelivering(Boolean(json.activeDelivery));
        })
        .catch(() => null);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // While online, the phone shares where the rider is so the nearest riders hear
  // about deliveries first and admins see them on the live map. During a
  // delivery it updates more often so the customer can follow the rider.
  // Nothing is shared while offline with no delivery.
  const sharing = online || delivering;
  useEffect(() => {
    if (!sharing || typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    const every = delivering ? 10_000 : 60_000;
    let latest: GeolocationPosition | null = null;
    let pending: number | null = null;
    const post = () => {
      pending = null;
      if (!latest) return;
      const position = latest;
      latest = null;
      lastSent.current = Date.now();
      setLocationNote(null);
      void fetch("/api/riders/me/location", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed ?? null,
        }),
      })
        .then((response) => response.json())
        .then((json: { ok?: boolean; activeDelivery?: boolean }) => {
          if (json?.ok && typeof json.activeDelivery === "boolean") {
            setDelivering(json.activeDelivery);
          }
        })
        .catch(() => null);
    };
    // Send at most once per interval, but never drop the newest position: a
    // move that arrives too soon is sent when the interval is up.
    const send = (position: GeolocationPosition) => {
      latest = position;
      if (pending !== null) return;
      const wait = every - (Date.now() - lastSent.current);
      if (wait <= 0) post();
      else pending = window.setTimeout(post, wait);
    };
    const watchId = navigator.geolocation.watchPosition(
      send,
      () =>
        setLocationNote(
          delivering
            ? "Allow location on this phone so the customer can see you on the way."
            : "Allow location on this phone to get deliveries near you first. Without it we use your area.",
        ),
      {
        enableHighAccuracy: delivering,
        maximumAge: delivering ? 5_000 : 60_000,
        timeout: 20_000,
      },
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (pending !== null) window.clearTimeout(pending);
      lastSent.current = 0;
    };
  }, [sharing, delivering]);

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
        {sharing ? (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {locationNote ||
              (delivering
                ? "You have a delivery, so the customer and Lethela can see where you are until it is delivered. Keep this page open."
                : "While you are online, Lethela uses your phone's location to send you deliveries near you.")}
          </p>
        ) : null}
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
