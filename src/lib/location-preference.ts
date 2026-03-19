const MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
const STORAGE_KEY = "lethela_location_v2";

export type PreferredLocation = {
  label: string;
  suburb: string;
  city?: string;
  lat?: number;
  lng?: number;
  source?: "manual" | "device";
  accuracyMeters?: number | null;
  savedAt?: string;
};

declare global {
  interface WindowEventMap {
    "lethela:location-changed": CustomEvent<PreferredLocation>;
  }
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function buildLabel(suburb: string, city?: string | null) {
  return [normalizeText(suburb), normalizeText(city || "")]
    .filter(Boolean)
    .join(", ");
}

function normalizeLocation(input: Partial<PreferredLocation> & { label?: string; suburb?: string }) {
  const suburb = normalizeText(input.suburb || input.label || "");
  const city = normalizeText(input.city || "");
  const label = normalizeText(input.label || buildLabel(suburb, city) || suburb);
  if (!suburb || !label) return null;

  return {
    label,
    suburb,
    city: city || undefined,
    lat: normalizeNumber(input.lat),
    lng: normalizeNumber(input.lng),
    source: input.source || "manual",
    accuracyMeters: typeof input.accuracyMeters === "number" && Number.isFinite(input.accuracyMeters) ? input.accuracyMeters : undefined,
    savedAt: input.savedAt || new Date().toISOString(),
  } satisfies PreferredLocation;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

export function persistPreferredLocation(input: Partial<PreferredLocation> & { label?: string; suburb?: string }) {
  const location = normalizeLocation(input);
  if (!location) return null;

  writeCookie("lethela_suburb", location.label);
  if (location.lat != null && location.lng != null) {
    writeCookie("lethela_lat", String(location.lat));
    writeCookie("lethela_lng", String(location.lng));
  } else {
    clearCookie("lethela_lat");
    clearCookie("lethela_lng");
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("lethela_suburb", location.label);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
      window.dispatchEvent(new CustomEvent("lethela:location-changed", { detail: location }));
    } catch {
      // ignore storage errors in restricted browsers
    }
  }

  return location;
}

export function persistPreferredSuburb(value: string) {
  const location = persistPreferredLocation({ label: value, suburb: value, source: "manual" });
  return location?.label || "";
}

export function readPreferredLocation(): PreferredLocation | null {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PreferredLocation;
        const location = normalizeLocation(parsed);
        if (location) return location;
      }
    } catch {
      // ignore malformed storage payloads
    }
  }

  const label = normalizeText(readCookie("lethela_suburb"));
  if (!label) {
    if (typeof window !== "undefined") {
      try {
        const saved = normalizeText(window.localStorage.getItem("lethela_suburb") || "");
        if (saved) {
          return normalizeLocation({ label: saved, suburb: saved, source: "manual" });
        }
      } catch {
        // ignore storage errors
      }
    }
    return null;
  }

  const lat = Number(readCookie("lethela_lat"));
  const lng = Number(readCookie("lethela_lng"));
  return normalizeLocation({
    label,
    suburb: label,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  });
}

export function readPreferredSuburb() {
  return readPreferredLocation()?.label || "";
}
