"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useEffect, useState } from "react";
import { canUseAnalyticsCookies } from "@/lib/cookie-consent";

export default function ConsentAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(canUseAnalyticsCookies());
    const update = () => setEnabled(canUseAnalyticsCookies());
    window.addEventListener("lethela:cookie-consent-changed", update);
    return () => window.removeEventListener("lethela:cookie-consent-changed", update);
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
