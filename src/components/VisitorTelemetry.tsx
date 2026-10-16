"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { canUsePushCookies } from "@/lib/cookie-consent";
import { readPreferredLocation } from "@/lib/location-preference";
import { trackMetaEvent } from "@/lib/meta-pixel";
import {
  ensureVisitorId,
  incrementPushPageViews,
  markPushPrompted,
  readSessionEntry,
  registerPushSubscription,
  trackVisitorEvent,
  wasPushPrompted,
} from "@/lib/visitor";

export default function VisitorTelemetry() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstPageRef = useRef(true);

  useEffect(() => {
    ensureVisitorId();
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/push-sw.js", { scope: "/" }).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const path = `${pathname || "/"}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    const preferredArea = readPreferredLocation()?.label || null;
    // Every visit is counted in Lethela's own database with a random visitor number
    // and no personal details. Ad tools only see it after cookies are accepted.
    const entry = readSessionEntry();
    void trackVisitorEvent({
      type: "page_view",
      path,
      preferredArea,
      meta: entry ? { entry } : undefined,
    });
    // The pixel counts the landing page itself; later in-app page changes are sent here.
    if (firstPageRef.current) firstPageRef.current = false;
    else trackMetaEvent("PageView");

    const pageViews = incrementPushPageViews();
    const isTransactionalPath =
      path.startsWith("/checkout") ||
      path.startsWith("/orders/") ||
      path.startsWith("/admin") ||
      path.startsWith("/vendors/dashboard") ||
      path.startsWith("/signin") ||
      path.startsWith("/signup") ||
      path.startsWith("/forgot-password") ||
      path.startsWith("/reset-password");
    const shouldPromptForPush =
      pageViews >= 1 &&
      !wasPushPrompted() &&
      !isTransactionalPath &&
      typeof Notification !== "undefined" &&
      Notification.permission === "default" &&
      canUsePushCookies() &&
      Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim());

    if (!shouldPromptForPush) return;

    const timeoutId = window.setTimeout(async () => {
      markPushPrompted();
      await registerPushSubscription().catch(() => undefined);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleLocationChanged = (event: WindowEventMap["lethela:location-changed"]) => {
      void trackVisitorEvent({
        type: "location_update",
        preferredArea: event.detail?.label || null,
        meta: {
          source: event.detail?.source || "manual",
          accuracyMeters: event.detail?.accuracyMeters ?? null,
        },
      });
    };

    window.addEventListener("lethela:location-changed", handleLocationChanged);
    return () => window.removeEventListener("lethela:location-changed", handleLocationChanged);
  }, []);

  return null;
}
