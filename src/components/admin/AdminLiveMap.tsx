"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bike, MapPin, Phone, RefreshCw, Store, Truck } from "lucide-react";
import LiveMap, { type LiveMapMarker } from "@/components/LiveMap";
import {
  dashButton,
  EmptyState,
  Notice,
  Panel,
  StatTile,
  StatusBadge,
  statusText,
  toneForStatus,
} from "@/components/dashboard/kit/ui";
import type { LiveTrackingSnapshot } from "@/lib/rider-tracking";

type Snapshot = LiveTrackingSnapshot & { ok: boolean; error?: string };

const REFRESH_MS = 15_000;
/** A position older than this is shown as "last seen" rather than live. */
const STALE_MS = 5 * 60 * 1000;

function ago(iso: string | null | undefined, now: number) {
  if (!iso) return null;
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
}

export default function AdminLiveMap({ onOpenOrder }: { onOpenOrder: (ref: string) => void }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/riders/live", { cache: "no-store" });
      const json = (await response.json().catch(() => ({}))) as Snapshot;
      if (!response.ok || !json.ok) throw new Error(json.error || "Could not load the live map.");
      setData(json);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the live map.");
    } finally {
      setLoading(false);
      setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const riders = useMemo(() => data?.riders ?? [], [data]);
  const deliveries = useMemo(() => data?.deliveries ?? [], [data]);
  const onDelivery = riders.filter((rider) => rider.onDelivery).length;
  const waiting = deliveries.filter((delivery) => !delivery.riderId).length;
  const noLocation = riders.filter((rider) => !rider.location).length;

  const { markers, lines } = useMemo(() => {
    const list: LiveMapMarker[] = [];
    const segments: Array<[{ lat: number; lng: number }, { lat: number; lng: number }]> = [];
    for (const delivery of deliveries) {
      if (delivery.vendorPoint) {
        list.push({
          id: `store-${delivery.ref}`,
          kind: "vendor",
          label: `${delivery.vendor} (order ${delivery.ref})`,
          ...delivery.vendorPoint,
        });
      }
      if (delivery.destination) {
        list.push({
          id: `drop-${delivery.ref}`,
          kind: "dest",
          label: `Drop-off for order ${delivery.ref}`,
          ...delivery.destination,
        });
      }
    }
    for (const rider of riders) {
      if (!rider.location) continue;
      const point = { lat: rider.location.lat, lng: rider.location.lng };
      list.push({
        id: `rider-${rider.id}`,
        kind: rider.onDelivery ? "rider" : "idle",
        label: `${rider.name}${rider.onDelivery ? ` · order ${rider.onDelivery.ref}` : " · free"}`,
        ...point,
      });
      const delivery = rider.onDelivery
        ? deliveries.find((row) => row.ref === rider.onDelivery?.ref)
        : null;
      const target =
        delivery?.status === "RIDER_ASSIGNED" ? delivery.vendorPoint : delivery?.destination;
      if (target) segments.push([point, target]);
    }
    return { markers: list, lines: segments };
  }, [deliveries, riders]);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Riders out now" value={riders.length} icon={<Bike />} />
        <StatTile label="On a delivery" value={onDelivery} icon={<Truck />} />
        <StatTile
          label="Waiting for a rider"
          value={waiting}
          icon={<Store />}
          tone={waiting > 0 ? "attention" : "default"}
          hint="Ready orders no rider has accepted yet"
        />
        <StatTile
          label="No location"
          value={noLocation}
          icon={<MapPin />}
          hint="Online riders whose phone has not shared a location"
        />
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <Panel
        title="Live map"
        description={
          data
            ? `Updates every 15 seconds. Last update ${ago(data.generatedAt, now) || "just now"}.`
            : "Loading riders and deliveries…"
        }
        padded={false}
        action={
          <button
            type="button"
            className={dashButton.secondary}
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        }
      >
        <div className="overflow-hidden rounded-b-xl">
          <LiveMap markers={markers} lines={lines} height={440} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-600 sm:px-5">
          <Legend colour="bg-lethela-primary" label="Rider on a delivery" />
          <Legend colour="bg-slate-500" label="Rider free" />
          <Legend colour="bg-blue-600" label="Store" />
          <Legend colour="bg-green-600" label="Drop-off" />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Riders out now"
          description="Online riders and riders on a delivery"
          padded={false}
        >
          {riders.length === 0 ? (
            <EmptyState
              compact
              title="No riders online"
              text="Riders show here when they tap Go online in their dashboard."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {riders.map((rider) => {
                const seen = ago(rider.location?.locatedAt, now);
                const stale =
                  rider.location && now - Date.parse(rider.location.locatedAt) > STALE_MS;
                return (
                  <li
                    key={rider.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
                  >
                    <div className="min-w-[12rem] flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{rider.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {[rider.vehicle, rider.area].filter(Boolean).join(" · ") || "No area set"}
                      </p>
                      <p
                        className={`text-xs ${stale || !seen ? "text-amber-700" : "text-slate-500"}`}
                      >
                        {seen ? `Location ${seen}` : "No location from their phone yet"}
                      </p>
                    </div>
                    {rider.onDelivery ? (
                      <button
                        type="button"
                        onClick={() => onOpenOrder(rider.onDelivery!.ref)}
                        className="text-left"
                      >
                        <StatusBadge tone={toneForStatus(rider.onDelivery.status)}>
                          {statusText(rider.onDelivery.status)} · {rider.onDelivery.ref}
                        </StatusBadge>
                      </button>
                    ) : (
                      <StatusBadge tone="success">Free</StatusBadge>
                    )}
                    {rider.phone ? (
                      <a
                        href={`tel:${rider.phone}`}
                        className={dashButton.secondary}
                        aria-label={`Call ${rider.name}`}
                      >
                        <Phone className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Open deliveries" description="Ready for pickup or on the way" padded={false}>
          {deliveries.length === 0 ? (
            <EmptyState
              compact
              title="No open deliveries"
              text="Orders show here from when the store marks them ready until they are delivered."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {deliveries.map((delivery) => {
                const seen = ago(delivery.riderLocatedAt, now);
                return (
                  <li key={delivery.ref}>
                    <button
                      type="button"
                      onClick={() => onOpenOrder(delivery.ref)}
                      className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 sm:px-5"
                    >
                      <div className="min-w-[12rem] flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {delivery.ref} · {delivery.vendor}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {delivery.riderName
                            ? `Rider: ${delivery.riderName}${seen ? `, seen ${seen}` : ", no location yet"}`
                            : "No rider yet"}
                        </p>
                        {delivery.dropoffAddress ? (
                          <p className="truncate text-xs text-slate-500">
                            To: {delivery.dropoffAddress}
                          </p>
                        ) : null}
                      </div>
                      <StatusBadge tone={toneForStatus(delivery.status)}>
                        {statusText(delivery.status)}
                      </StatusBadge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </section>
  );
}

function Legend({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${colour}`} aria-hidden="true" />
      {label}
    </span>
  );
}
