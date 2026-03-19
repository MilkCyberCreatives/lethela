import type { Vendor } from "@/types";

type PublicVendorSource = {
  id: string;
  name: string;
  slug: string;
  rating?: number | null;
  cuisine?: unknown;
  halaal?: boolean | null;
  image?: string | null;
  etaMins?: number | null;
  products?: Array<{ isAlcohol?: boolean | null }>;
};

export function parseCuisineList(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value || "[]");
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

export function getPublicVendorImage(image: string | null | undefined, hasAlcohol: boolean) {
  const trimmed = typeof image === "string" ? image.trim() : "";
  if (trimmed) return trimmed;
  return hasAlcohol ? "/vendors/vegan.jpg" : "/vendors/grill.jpg";
}

export function getPublicVendorBadge(source: Pick<PublicVendorSource, "halaal">, hasAlcohol: boolean) {
  if (source.halaal) return "Halaal";
  if (hasAlcohol) return "18+ available";
  return null;
}

export function getPublicVendorEta(baseEtaMin: number | null | undefined) {
  const start = Math.max(12, Math.round(baseEtaMin ?? 20));
  return `${start}-${start + 5} min`;
}

export function buildPublicVendorCard(
  source: PublicVendorSource & { distanceKm?: number | null; baseEtaMin?: number | null }
): Vendor {
  const hasAlcohol = (source.products ?? []).some((product) => Boolean(product.isAlcohol));
  const cuisines = parseCuisineList(source.cuisine);
  const baseEtaMin = source.baseEtaMin ?? source.etaMins ?? null;

  return {
    id: source.id,
    name: source.name,
    slug: source.slug,
    cover: getPublicVendorImage(source.image, hasAlcohol),
    badge: getPublicVendorBadge(source, hasAlcohol),
    rating: Number.isFinite(source.rating) ? Number(source.rating) : 4.4,
    cuisines,
    eta: getPublicVendorEta(baseEtaMin),
    distanceKm: source.distanceKm ?? undefined,
    baseEtaMin: baseEtaMin ?? undefined,
  };
}
