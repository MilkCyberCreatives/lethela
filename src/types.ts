// /src/types.ts
export type Vendor = {
  id: string;
  name: string;
  slug: string;
  cover: string;
  badge: string | null;
  rating: number;
  cuisines: string[];
  eta: string;          // display string
  distanceKm?: number;  // for AI ETA/rerank
  baseEtaMin?: number;  // vendor-prep baseline
};
