"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { readPreferredLocation } from "@/lib/location-preference";
import {
  ensureVisitorId,
  incrementPushPageViews,
  markPushPrompted,
  registerPushSubscription,
  trackVisitorEvent,
  wasPushPrompted,
} from "@/lib/visitor";

export default function VisitorTelemetry() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    ensureVisitorId();
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/push-sw.js", { scope: "/" }).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const path = `${pathname || "/"}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    const preferredArea = readPreferredLocation()?.label || null;
    void trackVisitorEvent({ type: "page_view", path, preferredArea });

    const pageViews = incrementPushPageViews();
    const shouldPromptForPush =
      pageViews >= 2 &&
      !wasPushPrompted() &&
      typeof Notification !== "undefined" &&
      Notification.permission === "default" &&
      Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim());

    if (!shouldPromptForPush) return;

    const timeoutId = window.setTimeout(async () => {
      markPushPrompted();
      await registerPushSubscription().catch(() => undefined);
    }, 4500);

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
