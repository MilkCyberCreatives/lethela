// /src/lib/tracking.ts
import { pushDataLayerEvent, trackVisitorEvent } from "@/lib/visitor";

const KEY = "lethela_clicks_vendors";

export type ClickMap = Record<string, number>;

export function getVendorClicks(): ClickMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordVendorClick(
  id: string,
  slug?: string,
  details?: {
    name?: string;
    rating?: number;
    cuisines?: string[];
  }
) {
  try {
    const m = getVendorClicks();
    m[id] = (m[id] ?? 0) + 1;
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {}

  void trackVisitorEvent({
    type: "vendor_click",
    vendorId: id,
    vendorSlug: slug,
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
    meta: {
      name: details?.name || null,
      rating: details?.rating ?? null,
      cuisines: details?.cuisines || [],
    },
  });
  pushDataLayerEvent("select_item", {
    content_type: "vendor",
    item_id: id,
    item_name: details?.name || null,
    vendor_slug: slug || null,
    item_category: details?.cuisines?.[0] || null,
  });
}
