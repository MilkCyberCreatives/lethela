"use client";

import { APIProvider, AdvancedMarker, Map, Pin } from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useState } from "react";

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

type MapMode = "fallback" | "embed" | "js";

function midpoint(points: TrackingPoint[]) {
  const totals = points.reduce(
    (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
    { lat: 0, lng: 0 },
  );
  return {
    lat: totals.lat / points.length,
    lng: totals.lng / points.length,
  };
}

function shouldRenderGoogleMap(apiKey?: string) {
  const key = apiKey?.trim();
  if (!key || key.length < 30 || /demo|example|replace|test/i.test(key)) return false;

  return true;
}

function getMapMode(apiKey?: string): MapMode {
  if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_JS_MODE === "true") {
    return shouldRenderGoogleMap(apiKey) ? "js" : "fallback";
  }

  return "embed";
}

function buildEmbedUrl(center: TrackingPoint) {
  const params = new URLSearchParams({
    q: `${center.lat},${center.lng}`,
    z: "13",
    output: "embed",
  });
  return `https://www.google.com/maps?${params.toString()}`;
}

export default function OrderMap({ rider, vendor, dest, compact = false }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [mapMode, setMapMode] = useState<MapMode>("fallback");
  const markers = [vendor, rider, dest].filter(Boolean) as TrackingPoint[];
  const center = useMemo(() => {
    if (markers.length === 0) return { lat: -26.2041, lng: 28.0473 };
    if (markers.length === 1) return markers[0];
    return midpoint(markers);
  }, [markers]);

  useEffect(() => {
    setMapMode(getMapMode(apiKey));
  }, [apiKey]);

  if (mapMode === "embed") {
    return (
      <div className="overflow-hidden rounded-lg border border-white/10">
        <iframe
          title="Google Maps tracking preview"
          src={buildEmbedUrl(center)}
          className="block w-full border-0"
          style={{ height: compact ? 260 : 360 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
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

  if (mapMode === "fallback") {
    return (
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <div className="font-semibold">Tracking map preview</div>
        <p className="mt-1 text-sm text-white/60">
          Live route markers will appear here when Google Maps is enabled for this environment.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/68">
          {vendor ? <LegendDot color="bg-blue-500" label="Vendor" /> : null}
          {rider ? <LegendDot color="bg-lethela-primary" label="Rider" /> : null}
          {dest ? <LegendDot color="bg-green-500" label="Drop-off" /> : null}
        </div>
      </div>
    );
  }

  const mapApiKey = apiKey?.trim() || "";

  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <APIProvider apiKey={mapApiKey}>
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
