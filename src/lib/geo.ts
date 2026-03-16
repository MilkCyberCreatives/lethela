export type LatLng = { lat: number; lng: number };

type KnownArea = {
  key: string;
  label: string;
  city: string;
  point: LatLng;
};

const FALLBACK_AREAS: KnownArea[] = [
  { key: "klipfontein view", label: "Klipfontein View", city: "Midrand", point: { lat: -25.9581, lng: 28.1452 } },
  { key: "midrand", label: "Midrand", city: "Midrand", point: { lat: -25.9992, lng: 28.1263 } },
  { key: "tembisa", label: "Tembisa", city: "Tembisa", point: { lat: -25.9967, lng: 28.2268 } },
  { key: "alexandra", label: "Alexandra", city: "Johannesburg", point: { lat: -26.1037, lng: 28.0978 } },
  { key: "soweto", label: "Soweto", city: "Johannesburg", point: { lat: -26.2485, lng: 27.854 } },
  { key: "katlehong", label: "Katlehong", city: "Katlehong", point: { lat: -26.338, lng: 28.1637 } },
  { key: "vosloorus", label: "Vosloorus", city: "Vosloorus", point: { lat: -26.3523, lng: 28.1479 } },
  { key: "soshanguve", label: "Soshanguve", city: "Soshanguve", point: { lat: -25.5345, lng: 28.097 } },
];

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

  const direct = FALLBACK_AREAS.find((area) => area.key === clean);
  if (direct) return direct.point;

  const matched = FALLBACK_AREAS.find((area) => clean.includes(area.key));
  return matched ? matched.point : FALLBACK_AREAS[0].point;
}

export async function reverseGeocodePoint(point: LatLng) {
  const googleKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("latlng", `${point.lat},${point.lng}`);
      url.searchParams.set("key", googleKey);

      const response = await fetch(url.toString(), { cache: "no-store" });
      const json = await response.json();
      const components = json?.results?.[0]?.address_components;
      if (Array.isArray(components)) {
        const suburbComponent = components.find((component: { long_name?: string; types?: string[] }) => {
          const types = Array.isArray(component.types) ? component.types : [];
          return ["sublocality", "sublocality_level_1", "locality", "neighborhood"].some((type) => types.includes(type));
        });
        const cityComponent = components.find((component: { long_name?: string; types?: string[] }) => {
          const types = Array.isArray(component.types) ? component.types : [];
          return ["locality", "administrative_area_level_2"].some((type) => types.includes(type));
        });
        const suburb = suburbComponent?.long_name?.trim();
        const city = cityComponent?.long_name?.trim() || suburb || "Midrand";
        if (suburb) {
          return { suburb, city };
        }
      }
    } catch {
      // fallback below
    }
  }

  const nearest = FALLBACK_AREAS.reduce((best, area) => {
    const distance = haversineKm(point.lat, point.lng, area.point.lat, area.point.lng);
    if (!best || distance < best.distance) {
      return { area, distance };
    }
    return best;
  }, null as { area: KnownArea; distance: number } | null);

  if (!nearest) {
    return { suburb: "Klipfontein View", city: "Midrand" };
  }

  return {
    suburb: nearest.area.label,
    city: nearest.area.city,
  };
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
