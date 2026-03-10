export type LatLng = { lat: number; lng: number };

const FALLBACK_SUBURB_POINTS: Record<string, LatLng> = {
  "klipfontein view": { lat: -25.9581, lng: 28.1452 },
  midrand: { lat: -25.9992, lng: 28.1263 },
  tembisa: { lat: -25.9967, lng: 28.2268 },
  alexandra: { lat: -26.1037, lng: 28.0978 },
  soweto: { lat: -26.2485, lng: 27.854 },
  katlehong: { lat: -26.338, lng: 28.1637 },
  vosloorus: { lat: -26.3523, lng: 28.1479 },
  soshanguve: { lat: -25.5345, lng: 28.097 },
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

export async function geocodeSuburb(query: string): Promise<LatLng | null> {
  const clean = normalize(query);
  if (!clean) return null;

  const googleKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("address", query);
      url.searchParams.set("components", "country:ZA");
      url.searchParams.set("key", googleKey);

      const response = await fetch(url.toString(), { cache: "no-store" });
      const json = await response.json();
      const point = json?.results?.[0]?.geometry?.location;
      if (point && Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
        return { lat: Number(point.lat), lng: Number(point.lng) };
      }
    } catch {
      // fallback below
    }
  }

  const direct = FALLBACK_SUBURB_POINTS[clean];
  if (direct) return direct;

  const matched = Object.entries(FALLBACK_SUBURB_POINTS).find(([key]) => clean.includes(key));
  return matched ? matched[1] : FALLBACK_SUBURB_POINTS["klipfontein view"];
}

export async function distanceMatrixETA(origin: LatLng, dest: LatLng) {
  const distanceKm = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
  const avgSpeedKmh = 32;
  const rushHour = (() => {
    const hour = new Date().getHours();
    if (hour >= 17 && hour <= 20) return 1.35;
    if (hour >= 7 && hour <= 9) return 1.25;
    return 1;
  })();

  const minutes = Math.max(6, Math.round(((distanceKm / avgSpeedKmh) * 60 + 8) * rushHour));
  return {
    distanceKm: Number(distanceKm.toFixed(2)),
    distanceText: `${distanceKm.toFixed(1)} km`,
    durationMin: minutes,
    durationText: `${minutes} min`,
  };
}
