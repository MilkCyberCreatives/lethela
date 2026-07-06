import type { Vendor } from "@/types";
import { isPublicReadyVendor } from "@/lib/vendor-readiness";

type PublicVendorSource = {
  id: string;
  name: string;
  slug: string;
  rating?: number | null;
  cuisine?: unknown;
  halaal?: boolean | null;
  image?: string | null;
  etaMins?: number | null;
  deliveryFee?: number | null;
  status?: string | null;
  isActive?: boolean | null;
  phone?: string | null;
  address?: string | null;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  municipality?: string | null;
  township?: string | null;
  sectionArea?: string | null;
  storeType?: string | null;
  kycIdUrl?: string | null;
  kycProofUrl?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankBranchCode?: string | null;
  _count?: { products?: number; items?: number; hours?: number };
  products?: Array<{ isAlcohol?: boolean | null }>;
  reviews?: Array<{ rating?: number | null }>;
};

type PublicProductSource = {
  id?: string | null;
  name: string;
  vendor?: {
    name?: string | null;
    slug?: string | null;
  } | null;
  vendorName?: string | null;
  vendorSlug?: string | null;
};

const HIDDEN_PUBLIC_VENDOR_TERMS = ["milk cyber creatives", "milk-cyber-creatives", "leadvault"];

export function isPublicCatalogVendor(source: Pick<PublicVendorSource, "name" | "slug">) {
  const name = source.name.trim().toLowerCase();
  const slug = source.slug.trim().toLowerCase();

  if (name.startsWith("demo ") || slug.startsWith("demo-")) return false;
  return !HIDDEN_PUBLIC_VENDOR_TERMS.some((term) => name.includes(term) || slug.includes(term));
}

export function isPublicMarketplaceVendor(source: PublicVendorSource) {
  if (!isPublicCatalogVendor(source)) return false;
  return isPublicReadyVendor({
    ...source,
    productCount: source._count?.products ?? source.products?.length ?? 0,
    menuItemCount: source._count?.items ?? 0,
    operatingHoursCount: source._count?.hours ?? 0,
  });
}

export function isPublicCatalogProduct(source: PublicProductSource) {
  const id = String(source.id ?? "")
    .trim()
    .toLowerCase();
  const name = source.name.trim().toLowerCase();
  const vendorName = source.vendor?.name ?? source.vendorName ?? "";
  const vendorSlug = source.vendor?.slug ?? source.vendorSlug ?? "";

  if (id.startsWith("demo-") || name.startsWith("demo ")) return false;
  return isPublicCatalogVendor({ name: vendorName, slug: vendorSlug });
}

export function parseCuisineList(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value || "[]");
      return Array.isArray(parsed)
        ? parsed.filter(
            (item): item is string => typeof item === "string" && item.trim().length > 0,
          )
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

export function getPublicVendorBadge(source: Pick<PublicVendorSource, "halaal">) {
  if (source.halaal) return "Halaal";
  return null;
}

export function getPublicVendorEta(baseEtaMin: number | null | undefined) {
  const start = Math.max(12, Math.round(baseEtaMin ?? 20));
  return `${start}-${start + 5} min`;
}

export function buildPublicVendorCard(
  source: PublicVendorSource & { distanceKm?: number | null; baseEtaMin?: number | null },
): Vendor {
  const hasAlcohol = (source.products ?? []).some((product) => Boolean(product.isAlcohol));
  const cuisines = parseCuisineList(source.cuisine);
  const baseEtaMin = source.baseEtaMin ?? source.etaMins ?? null;
  const reviewValues = (source.reviews ?? [])
    .map((review) => Number(review.rating))
    .filter((rating) => Number.isFinite(rating));
  const averageRating =
    reviewValues.length > 0
      ? Number(
          (reviewValues.reduce((sum, rating) => sum + rating, 0) / reviewValues.length).toFixed(1),
        )
      : null;

  return {
    id: source.id,
    name: source.name,
    slug: source.slug,
    cover: getPublicVendorImage(source.image, hasAlcohol),
    badge: getPublicVendorBadge(source),
    rating: averageRating,
    reviewCount: reviewValues.length,
    deliveryFeeCents: DEFAULT_CARD_DELIVERY_FEE_CENTS,
    cuisines,
    area: source.township || source.suburb || source.city || null,
    storeType: source.storeType || null,
    isOpen: true,
    eta: getPublicVendorEta(baseEtaMin),
    distanceKm: source.distanceKm ?? undefined,
    baseEtaMin: baseEtaMin ?? undefined,
  };
}

const DEFAULT_CARD_DELIVERY_FEE_CENTS = 1000;
