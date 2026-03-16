const MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export function normalizePreferredSuburb(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function persistPreferredSuburb(value: string) {
  const suburb = normalizePreferredSuburb(value);
  if (!suburb) return "";

  if (typeof document !== "undefined") {
    document.cookie = `lethela_suburb=${encodeURIComponent(suburb)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("lethela_suburb", suburb);
    } catch {
      // ignore storage errors in restricted browsers
    }
  }

  return suburb;
}

export function readPreferredSuburb() {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)lethela_suburb=([^;]+)/);
    if (match?.[1]) {
      const suburb = normalizePreferredSuburb(decodeURIComponent(match[1]));
      if (suburb) return suburb;
    }
  }

  if (typeof window !== "undefined") {
    try {
      const saved = normalizePreferredSuburb(window.localStorage.getItem("lethela_suburb") || "");
      if (saved) return saved;
    } catch {
      // ignore storage errors in restricted browsers
    }
  }

  return "";
}
