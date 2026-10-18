"use client";

import { useMemo } from "react";
import LiveMap, { type LiveMapMarker } from "@/components/LiveMap";

type TrackingPoint = {
  lat: number;
  lng: number;
};

type Props = {
  rider?: TrackingPoint | null;
  vendor?: TrackingPoint | null;
  dest?: TrackingPoint | null;
  compact?: boolean;
};

export default function OrderMap({ rider, vendor, dest, compact = false }: Props) {
  const markers = useMemo(() => {
    const list: LiveMapMarker[] = [];
    if (vendor) list.push({ id: "vendor", kind: "vendor", label: "Store", ...vendor });
    if (dest) list.push({ id: "dest", kind: "dest", label: "Drop-off", ...dest });
    if (rider) list.push({ id: "rider", kind: "rider", label: "Rider", ...rider });
    return list;
  }, [rider, vendor, dest]);
  const lines = useMemo(
    () =>
      rider && dest
        ? [[rider, dest] as [TrackingPoint, TrackingPoint]]
        : vendor && dest
          ? [[vendor, dest] as [TrackingPoint, TrackingPoint]]
          : [],
    [rider, vendor, dest],
  );

  if (markers.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <div className="font-semibold">Tracking map</div>
        <p className="mt-1 text-sm text-white/60">
          The map shows here once the store and drop-off locations are known.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <LiveMap markers={markers} lines={lines} height={compact ? 260 : 360} />
      <div className="border-t border-white/10 bg-black/20 px-4 py-2">
        <div className="flex flex-wrap gap-2 text-xs text-white/68">
          {vendor ? <LegendDot color="bg-blue-500" label="Vendor" /> : null}
          {rider ? <LegendDot color="bg-lethela-primary" label="Rider" /> : null}
          {dest ? <LegendDot color="bg-green-500" label="Drop-off" /> : null}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
