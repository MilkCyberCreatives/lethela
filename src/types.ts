// /src/types.ts
export type Vendor = {
  id: string;
  name: string;
  slug: string;
  cover: string;
  badge: string | null;
  rating: number | null;
  reviewCount?: number;
  deliveryFeeCents?: number;
  cuisines: string[];
  area?: string | null;
  storeType?: string | null;
  isOpen?: boolean;
  eta: string; // display string
  distanceKm?: number; // for AI ETA/rerank
  baseEtaMin?: number; // vendor-prep baseline
};
