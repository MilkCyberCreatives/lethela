export type LatLng = { lat: number; lng: number };
export type RouteDistanceSource = "ROAD" | "ESTIMATED";

export type RouteDistance = {
  distanceKm: number;
  durationMin: number | null;
  source: RouteDistanceSource;
};

type KnownArea = {
  key: string;
  label: string;
  city: string;
  point: LatLng;
};

const FALLBACK_AREAS: KnownArea[] = [
  {
    key: "klipfontein view",
    label: "Klipfontein View",
    city: "Midrand",
    point: { lat: -25.9581, lng: 28.1452 },
  },
  { key: "midrand", label: "Midrand", city: "Midrand", point: { lat: -25.9992, lng: 28.1263 } },
  { key: "tembisa", label: "Tembisa", city: "Tembisa", point: { lat: -25.9967, lng: 28.2268 } },
  {
    key: "alexandra",
    label: "Alexandra",
    city: "Johannesburg",
    point: { lat: -26.1037, lng: 28.0978 },
  },
  { key: "soweto", label: "Soweto", city: "Johannesburg", point: { lat: -26.2485, lng: 27.854 } },
  {
    key: "katlehong",
    label: "Katlehong",
    city: "Katlehong",
    point: { lat: -26.338, lng: 28.1637 },
  },
  {
    key: "vosloorus",
    label: "Vosloorus",
    city: "Vosloorus",
    point: { lat: -26.3523, lng: 28.1479 },
  },
  {
    key: "soshanguve",
    label: "Soshanguve",
    city: "Soshanguve",
    point: { lat: -25.5345, lng: 28.097 },
  },
];

const ROAD_DISTANCE_FALLBACK_MULTIPLIER = 1.25;

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function mapsApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

function parseGoogleDurationMinutes(value: unknown) {
  const match = String(value || "").match(/^([0-9]+(?:\.[0-9]+)?)s$/);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? Math.max(1, Math.ceil(seconds / 60)) : null;
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

export async function routeDistance(origin: LatLng, destination: LatLng): Promise<RouteDistance> {
  const googleKey = mapsApiKey();
  if (googleKey) {
    try {
      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(4_500),
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": googleKey,
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: { latitude: origin.lat, longitude: origin.lng },
            },
          },
          destination: {
            location: {
              latLng: { latitude: destination.lat, longitude: destination.lng },
            },
          },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          computeAlternativeRoutes: false,
          languageCode: "en-ZA",
          units: "METRIC",
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const route = json?.routes?.[0];
        const distanceMeters = Number(route?.distanceMeters);
        if (Number.isFinite(distanceMeters) && distanceMeters > 0) {
          return {
            distanceKm: Number((distanceMeters / 1000).toFixed(2)),
            durationMin: parseGoogleDurationMinutes(route?.duration),
            source: "ROAD",
          };
        }
      }
    } catch {
      // Use a conservative road-distance estimate below.
    }
  }

  const straightLineKm = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
  const estimatedRoadKm = Math.max(
    straightLineKm,
    straightLineKm * ROAD_DISTANCE_FALLBACK_MULTIPLIER,
  );
  const durationMin = Math.max(6, Math.ceil((estimatedRoadKm / 28) * 60 + 8));
  return {
    distanceKm: Number(estimatedRoadKm.toFixed(2)),
    durationMin,
    source: "ESTIMATED",
  };
}

export async function geocodeSuburb(query: string): Promise<LatLng | null> {
  const clean = normalize(query);
  if (!clean) return null;

  const googleKey = mapsApiKey();
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
  return matched ? matched.point : null;
}

export async function reverseGeocodePoint(point: LatLng) {
  const googleKey = mapsApiKey();
  if (googleKey) {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("latlng", `${point.lat},${point.lng}`);
      url.searchParams.set("key", googleKey);

      const response = await fetch(url.toString(), { cache: "no-store" });
      const json = await response.json();
      const components = json?.results?.[0]?.address_components;
      if (Array.isArray(components)) {
        const suburbComponent = components.find(
          (component: { long_name?: string; types?: string[] }) => {
            const types = Array.isArray(component.types) ? component.types : [];
            return ["sublocality", "sublocality_level_1", "locality", "neighborhood"].some((type) =>
              types.includes(type),
            );
          },
        );
        const cityComponent = components.find(
          (component: { long_name?: string; types?: string[] }) => {
            const types = Array.isArray(component.types) ? component.types : [];
            return ["locality", "administrative_area_level_2"].some((type) => types.includes(type));
          },
        );
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

  const nearest = FALLBACK_AREAS.reduce(
    (best, area) => {
      const distance = haversineKm(point.lat, point.lng, area.point.lat, area.point.lng);
      if (!best || distance < best.distance) {
        return { area, distance };
      }
      return best;
    },
    null as { area: KnownArea; distance: number } | null,
  );

  if (!nearest) {
    return { suburb: "Klipfontein View", city: "Midrand" };
  }

  return {
    suburb: nearest.area.label,
    city: nearest.area.city,
  };
}

export async function distanceMatrixETA(origin: LatLng, dest: LatLng) {
  const route = await routeDistance(origin, dest);
  const hour = new Date().getHours();
  const rush = hour >= 18 && hour <= 20 ? 1.25 : hour >= 12 && hour <= 13 ? 1.15 : 1;
  const durationMin = route.durationMin
    ? Math.max(6, Math.round(route.durationMin * rush))
    : Math.max(6, Math.round(((route.distanceKm / 32) * 60 + 8) * rush));

  return {
    distanceKm: route.distanceKm,
    distanceText: `${route.distanceKm.toFixed(1)} km`,
    durationMin,
    durationText: `${durationMin} min`,
    distanceSource: route.source,
  };
}
