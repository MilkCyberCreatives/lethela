"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { canUseAnalyticsCookies } from "@/lib/cookie-consent";

const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((module) => module.Analytics),
  { ssr: false },
);
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((module) => module.SpeedInsights),
  { ssr: false },
);

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
