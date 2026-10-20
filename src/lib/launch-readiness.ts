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

  // Listed stores always have something to order (an approved product or a published menu
  // item), so the pilot opens with the first store even when its items are all on its menu.
  if (vendors === 0) {
    return {
      phase: "PRE_LAUNCH",
      eyebrow: "Now open in Klipfontein View. New stores and riders are joining every day.",
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
