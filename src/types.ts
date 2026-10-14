// /src/types.ts
import type { StoreHour } from "@/lib/store-availability";

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
  hours?: StoreHour[]; // lets the card say Open or Closed in the browser
  temporaryClosed?: boolean;
  eta: string; // display string
  distanceKm?: number; // for AI ETA/rerank
  baseEtaMin?: number; // vendor-prep baseline
};
