function isTruthy(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function shouldPreferCatalogFallback() {
  return isTruthy(process.env.FORCE_CATALOG_FALLBACK);
}
