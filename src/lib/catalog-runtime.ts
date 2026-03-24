function isTruthy(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export type CatalogMode = "demo" | "live";

function isProductionCatalogRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

function allowProductionDemoCatalog() {
  return isTruthy(process.env.ALLOW_PRODUCTION_DEMO_CATALOG);
}

export function getCatalogMode(): CatalogMode {
  const wantsDemoCatalog =
    isTruthy(process.env.DEMO_CATALOG_MODE) || isTruthy(process.env.FORCE_CATALOG_FALLBACK);

  if (wantsDemoCatalog) {
    if (isProductionCatalogRuntime() && !allowProductionDemoCatalog()) {
      throw new Error(
        "Demo catalog mode is disabled for production launches. Remove DEMO_CATALOG_MODE/FORCE_CATALOG_FALLBACK or explicitly set ALLOW_PRODUCTION_DEMO_CATALOG=true for a temporary non-launch environment."
      );
    }

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
