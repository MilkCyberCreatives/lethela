import { canUseAnalyticsCookies } from "@/lib/cookie-consent";

export const META_EVENT_NAMES = [
  "PageView",
  "ViewContent",
  "Search",
  "AddToCart",
  "InitiateCheckout",
  "Purchase",
  "Lead",
  "CompleteRegistration",
] as const;

export type MetaEventName = (typeof META_EVENT_NAMES)[number];

export type MetaEventParams = {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  num_items?: number;
  search_string?: string;
};

type FbqArgs = [string, ...unknown[]];

declare global {
  interface Window {
    fbq?: (...args: FbqArgs) => void;
    __lethelaFbqPending?: FbqArgs[];
  }
}

const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";

function newEventId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Sends a Meta (Facebook and Instagram) event from the browser pixel and, with the
 * same event id so Meta counts it once, from the server. Nothing is sent unless
 * the visitor accepted cookies and a pixel id is set.
 */
export function trackMetaEvent(
  name: MetaEventName,
  params: MetaEventParams = {},
  eventId?: string,
) {
  if (typeof window === "undefined" || !pixelId || !canUseAnalyticsCookies()) return;
  const id = eventId || newEventId();
  const args: FbqArgs = ["track", name, params, { eventID: id }];

  // The pixel loads late so it never slows the page; events wait for it.
  if (window.fbq) window.fbq(...args);
  else (window.__lethelaFbqPending ||= []).push(args);

  try {
    void fetch("/api/meta/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, eventId: id, params, url: window.location.href }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore
  }
}

type EcommerceItem = { item_id?: string; item_name?: string; quantity?: number };

function contentIds(items: unknown) {
  if (!Array.isArray(items)) return undefined;
  const ids = (items as EcommerceItem[]).map((item) => item.item_id).filter(Boolean) as string[];
  return ids.length ? ids.slice(0, 20) : undefined;
}

function numItems(items: unknown) {
  if (!Array.isArray(items)) return undefined;
  return (items as EcommerceItem[]).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
}

/** Mirrors the site's existing analytics events to Meta for ad audiences. */
export function mirrorToMeta(event: string, payload: Record<string, unknown>) {
  const value = typeof payload.value === "number" ? payload.value : undefined;
  const currency =
    typeof payload.currency === "string" ? payload.currency : value ? "ZAR" : undefined;
  const items = payload.items;

  switch (event) {
    case "add_to_cart":
      trackMetaEvent("AddToCart", {
        value,
        currency,
        content_ids: contentIds(items),
        content_type: "product",
      });
      break;
    case "begin_checkout":
      trackMetaEvent("InitiateCheckout", {
        value,
        currency,
        content_ids: contentIds(items),
        content_type: "product",
        num_items: numItems(items),
      });
      break;
    case "purchase": {
      const orderId = String(payload.transaction_id || "");
      trackMetaEvent(
        "Purchase",
        {
          value: value ?? 0,
          currency: currency || "ZAR",
          content_ids: contentIds(items),
          content_type: "product",
          num_items: numItems(items),
        },
        orderId ? `purchase-${orderId}` : undefined,
      );
      break;
    }
    case "select_item":
      trackMetaEvent("ViewContent", {
        content_ids: contentIds(items) || (payload.item_id ? [String(payload.item_id)] : undefined),
        content_name: typeof payload.item_name === "string" ? payload.item_name : undefined,
        content_type: payload.content_type === "vendor" ? "product_group" : "product",
      });
      break;
    case "sign_up":
      trackMetaEvent("CompleteRegistration", {
        content_name: String(payload.account_type || "customer").slice(0, 60),
      });
      break;
    case "search":
      if (typeof payload.search_term === "string") {
        trackMetaEvent("Search", { search_string: payload.search_term.slice(0, 100) });
      }
      break;
    case "generate_lead":
      trackMetaEvent(
        String(payload.lead_type || "").includes("account_created")
          ? "CompleteRegistration"
          : "Lead",
        { content_name: String(payload.lead_type || "lead").slice(0, 60) },
      );
      break;
    default:
      break;
  }
}
