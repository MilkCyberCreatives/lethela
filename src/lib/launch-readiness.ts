export type MarketplaceLaunchPhase = "PRE_LAUNCH" | "PILOT" | "PUBLIC";

export type MarketplaceLaunchStatus = {
  phase: MarketplaceLaunchPhase;
  eyebrow: string;
  headline: string;
  description: string;
};

function publicModeEnabled() {
  return process.env.NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE?.trim().toLowerCase() === "public";
}

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
      eyebrow: "Launching shortly in Klipfontein View. Vendors and riders are joining now.",
      headline: "Township favourites, delivered fast.",
      description:
        "Order KoTa, chicken and everyday essentials from local stores, delivered by community riders.",
    };
  }

  if (!publicModeEnabled() || vendors < 3 || products < 20) {
    return {
      phase: "PILOT",
      eyebrow: "Pilot now open in Klipfontein View.",
      headline: "Township favourites, delivered fast.",
      description:
        "Order from approved local vendors while we carefully grow the first delivery zone.",
    };
  }

  return {
    phase: "PUBLIC",
    eyebrow: "Now delivering in Klipfontein View.",
    headline: "Township favourites, delivered fast.",
    description: "KoTa, chicken and everyday essentials from approved local vendors near you.",
  };
}
