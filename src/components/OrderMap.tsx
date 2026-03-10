// /src/components/OrderMap.tsx
"use client";

import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useState } from "react";

type Props = {
  rider?: { lat: number; lng: number } | null;
  vendor?: { lat: number; lng: number } | null;
  dest?: { lat: number; lng: number } | null;
};

export default function OrderMap({ rider, vendor, dest }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
  const center = useMemo(() => rider ?? vendor ?? dest ?? { lat: -26.2041, lng: 28.0473 }, [rider, vendor, dest]);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(Boolean(apiKey)), [apiKey]);

  if (!ready) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <div className="font-semibold">Map unavailable</div>
        <p className="mt-1 text-sm text-white/60">Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultZoom={13}
          defaultCenter={center}
          gestureHandling={"greedy"}
          disableDefaultUI
          mapId={undefined}
          style={{ width: "100%", height: 320 }}
        >
          {vendor && (
            <AdvancedMarker position={vendor}>
              <Pin background={"#3b82f6"} borderColor={"#1e40af"} glyphColor={"#fff"} />
            </AdvancedMarker>
          )}
          {dest && (
            <AdvancedMarker position={dest}>
              <Pin background={"#22c55e"} borderColor={"#14532d"} glyphColor={"#fff"} />
            </AdvancedMarker>
          )}
          {rider && (
            <AdvancedMarker position={rider}>
              <Pin background={"#B5001B"} borderColor={"#7a0012"} glyphColor={"#fff"} />
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
