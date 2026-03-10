// src/lib/location.ts
import { getCookie } from "@/lib/cookie-helpers";

/**
 * Reads suburb from cookie "lethela_suburb".
 * Returns null if not set.
 */
export async function getSuburbFromCookies(): Promise<string | null> {
  const raw = await getCookie("lethela_suburb");
  if (!raw) return null;
  const cleaned = raw.trim();
  return cleaned || null;
}

export async function getDisplaySuburb(): Promise<string> {
  const fromCookie = await getSuburbFromCookies();
  return fromCookie || "Klipfontein View, Midrand 1685";
}
