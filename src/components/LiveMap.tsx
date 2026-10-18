"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";

export type LiveMapMarker = {
  id: string;
  lat: number;
  lng: number;
  /** "rider" | "vendor" | "dest" pick the colour; anything else is grey. */
  kind: "rider" | "vendor" | "dest" | "idle";
  label: string;
};

const COLOURS: Record<LiveMapMarker["kind"], string> = {
  rider: "#B5001B",
  vendor: "#2563eb",
  dest: "#16a34a",
  idle: "#64748b",
};

const DEFAULT_CENTER: [number, number] = [-26.2041, 28.0473];

/**
 * OpenStreetMap map with coloured dots. It needs no API key, so tracking works
 * whether or not Google Maps is set up.
 */
export default function LiveMap({
  markers,
  height = 360,
  lines = [],
}: {
  markers: LiveMapMarker[];
  height?: number;
  /** Dashed lines between points, e.g. rider to drop-off. */
  lines?: Array<[{ lat: number; lng: number }, { lat: number; lng: number }]>;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const fitted = useRef("");
  const [leaflet, setLeaflet] = useState<typeof import("leaflet") | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((mod) => {
      // Leaflet is a CommonJS bundle, so the library may sit on .default.
      const L = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod;
      if (cancelled || !container.current || map.current) return;
      map.current = L.map(container.current, { zoomControl: true, attributionControl: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map.current);
      layer.current = L.layerGroup().addTo(map.current);
      map.current.setView(DEFAULT_CENTER, 12);
      setLeaflet(L);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
      fitted.current = "";
    };
  }, []);

  useEffect(() => {
    if (!leaflet || !map.current || !layer.current) return;
    fitted.current = drawMarkers(
      leaflet,
      map.current,
      layer.current,
      markers,
      lines,
      fitted.current,
    );
  }, [leaflet, markers, lines]);

  return (
    <div
      ref={container}
      className="relative z-0 w-full bg-slate-100"
      style={{ height }}
      role="region"
      aria-label="Live map"
    />
  );
}

/** Redraws the dots and lines. Returns the key of what the map is zoomed to. */
function drawMarkers(
  L: typeof import("leaflet"),
  current: LeafletMap,
  group: LayerGroup,
  points: LiveMapMarker[],
  segments: Array<[{ lat: number; lng: number }, { lat: number; lng: number }]>,
  fittedKey: string,
) {
  group.clearLayers();
  for (const [from, to] of segments) {
    L.polyline(
      [
        [from.lat, from.lng],
        [to.lat, to.lng],
      ],
      { color: "#0f172a", weight: 2, opacity: 0.5, dashArray: "6 6" },
    ).addTo(group);
  }
  for (const point of points) {
    L.circleMarker([point.lat, point.lng], {
      radius: point.kind === "rider" ? 9 : 7,
      color: "#ffffff",
      weight: 2,
      fillColor: COLOURS[point.kind],
      fillOpacity: 1,
    })
      .bindTooltip(point.label)
      .addTo(group);
  }
  // Zoom to fit when the set of things on the map changes, not on every move,
  // so someone panning around is not pulled back every few seconds.
  const key = points
    .map((point) => point.id)
    .sort()
    .join("|");
  if (key === fittedKey || points.length === 0) return fittedKey;
  if (points.length === 1) {
    current.setView([points[0].lat, points[0].lng], 15);
  } else {
    current.fitBounds(
      L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number])),
      { padding: [36, 36], maxZoom: 16 },
    );
  }
  return key;
}
