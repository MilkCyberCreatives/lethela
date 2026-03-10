export function shouldPreferCatalogFallback() {
  const databaseUrl = process.env.DATABASE_URL?.trim().toLowerCase() ?? "";

  if (!process.env.VERCEL || process.env.NODE_ENV !== "production") {
    return false;
  }

  return databaseUrl === "" || databaseUrl.startsWith("file:");
}
