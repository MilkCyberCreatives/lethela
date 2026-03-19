"use client";

import { APIProvider, AdvancedMarker, Map, Pin } from "@vis.gl/react-google-maps";
import { useMemo } from "react";

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

function midpoint(points: TrackingPoint[]) {
  const totals = points.reduce(
    (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
    { lat: 0, lng: 0 }
  );
  return {
    lat: totals.lat / points.length,
    lng: totals.lng / points.length,
  };
}

export default function OrderMap({ rider, vendor, dest, compact = false }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const markers = [vendor, rider, dest].filter(Boolean) as TrackingPoint[];
  const center = useMemo(() => {
    if (markers.length === 0) return { lat: -26.2041, lng: 28.0473 };
    if (markers.length === 1) return markers[0];
    return midpoint(markers);
  }, [markers]);

  if (!apiKey) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <div className="font-semibold">Map unavailable</div>
        <p className="mt-1 text-sm text-white/60">Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to enable live map tracking.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <APIProvider apiKey={apiKey}>
        <Map
          center={center}
          zoom={compact ? 12 : 13}
          gestureHandling="greedy"
          disableDefaultUI
          mapId={undefined}
          style={{ width: "100%", height: compact ? 260 : 360 }}
        >
          {vendor ? (
            <AdvancedMarker position={vendor} title="Vendor">
              <Pin background="#2563eb" borderColor="#1d4ed8" glyphColor="#fff" />
            </AdvancedMarker>
          ) : null}
          {dest ? (
            <AdvancedMarker position={dest} title="Destination">
              <Pin background="#16a34a" borderColor="#166534" glyphColor="#fff" />
            </AdvancedMarker>
          ) : null}
          {rider ? (
            <AdvancedMarker position={rider} title="Rider">
              <Pin background="#B5001B" borderColor="#7a0012" glyphColor="#fff" />
            </AdvancedMarker>
          ) : null}
        </Map>
      </APIProvider>

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
