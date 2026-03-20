function isTruthy(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export type CatalogMode = "demo" | "live";

export function getCatalogMode(): CatalogMode {
  if (isTruthy(process.env.DEMO_CATALOG_MODE)) {
    return "demo";
  }

  if (isTruthy(process.env.FORCE_CATALOG_FALLBACK)) {
    return "demo";
  }

  return "live";
}

export function isDemoCatalogMode() {
  return getCatalogMode() === "demo";
}

export function shouldPreferCatalogFallback() {
  return isDemoCatalogMode();
}
