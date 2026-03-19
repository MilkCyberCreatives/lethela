export const VISITOR_COOKIE_NAME = "lethela_visitor_id";
const VISITOR_STORAGE_KEY = "lethela_visitor_id";
const VISITOR_PUSH_PROMPTED_KEY = "lethela_push_prompted";
const VISITOR_PUSH_PAGEVIEWS_KEY = "lethela_push_pageviews";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

export type VisitorEventInput = {
  type:
    | "page_view"
    | "search"
    | "vendor_click"
    | "product_add"
    | "recommendation_click"
    | "location_update"
    | "push_opt_in";
  path?: string;
  vendorId?: string;
  vendorSlug?: string;
  productId?: string;
  searchQuery?: string;
  preferredArea?: string | null;
  meta?: Record<string, unknown>;
};

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${VISITOR_COOKIE_MAX_AGE}; samesite=lax`;
}

export function readVisitorId() {
  if (typeof window === "undefined") return "";
  try {
    const fromStorage = window.localStorage.getItem(VISITOR_STORAGE_KEY) || "";
    if (fromStorage) return fromStorage;
  } catch {
    // ignore
  }

  return readCookie(VISITOR_COOKIE_NAME);
}

export function ensureVisitorId() {
  if (typeof window === "undefined") return "";

  const existing = readVisitorId();
  if (existing) return existing;

  const next = crypto.randomUUID();
  try {
    window.localStorage.setItem(VISITOR_STORAGE_KEY, next);
  } catch {
    // ignore
  }
  writeCookie(VISITOR_COOKIE_NAME, next);
  return next;
}

export function incrementPushPageViews() {
  if (typeof window === "undefined") return 0;
  try {
    const next = Number(window.localStorage.getItem(VISITOR_PUSH_PAGEVIEWS_KEY) || "0") + 1;
    window.localStorage.setItem(VISITOR_PUSH_PAGEVIEWS_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

export function wasPushPrompted() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(VISITOR_PUSH_PROMPTED_KEY) === "true";
  } catch {
    return false;
  }
}

export function markPushPrompted() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VISITOR_PUSH_PROMPTED_KEY, "true");
  } catch {
    // ignore
  }
}

function toBase64Uint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const decoded = window.atob(normalized);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

export async function registerPushSubscription() {
  if (typeof window === "undefined") return { ok: false as const, reason: "browser" };
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false as const, reason: "unsupported" };
  }

  const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false as const, reason: permission };
    }
  } else if (Notification.permission !== "granted") {
    return { ok: false as const, reason: Notification.permission };
  }

  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toBase64Uint8Array(publicKey),
    }));

  const visitorId = ensureVisitorId();
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ visitorId, subscription }),
  });

  if (!response.ok) {
    return { ok: false as const, reason: `subscribe-${response.status}` };
  }

  void trackVisitorEvent({ type: "push_opt_in" });
  return { ok: true as const };
}

export async function trackVisitorEvent(input: VisitorEventInput) {
  if (typeof window === "undefined") return;

  const payload = {
    visitorId: ensureVisitorId(),
    ...input,
    meta: input.meta ?? undefined,
  };

  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const sent = navigator.sendBeacon("/api/visitors/events", blob);
      if (sent) return;
    }

    await fetch("/api/visitors/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // ignore telemetry failures
  }
}
