export type MarketplaceLaunchPhase = "PRE_LAUNCH" | "PILOT" | "PUBLIC";

export type MarketplaceLaunchStatus = {
  phase: MarketplaceLaunchPhase;
  eyebrow: string;
  headline: string;
  description: string;
};

const publicModeEnabled =
  process.env.NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE?.trim().toLowerCase() === "public";

export function getMarketplaceLaunchStatus({
  approvedVendorCount,
  publicProductCount,
}: {
  approvedVendorCount: number;
  publicProductCount: number;
}): MarketplaceLaunchStatus {
  const vendors = Math.max(0, Math.floor(approvedVendorCount));
  const products = Math.max(0, Math.floor(publicProductCount));

  if (vendors === 0 || products === 0) {
    return {
      phase: "PRE_LAUNCH",
      eyebrow:
        "Launching shortly in Klipfontein View. Vendors and riders are joining now.",
      headline: "Lethela — Siyashesha",
      description:
        "Local stores, affordable township delivery and community riders — all in one place.",
    };
  }

  if (!publicModeEnabled || vendors < 3 || products < 20) {
    return {
      phase: "PILOT",
      eyebrow: "Pilot now open in Klipfontein View.",
      headline: "Lethela — Siyashesha",
      description:
        "Order from approved local vendors while we carefully grow the first delivery zone.",
    };
  }

  return {
    phase: "PUBLIC",
    eyebrow: "Now delivering in Klipfontein View.",
    headline: "Lethela — Siyashesha",
    description: "Fast deliveries from approved local vendors near you.",
  };
}
