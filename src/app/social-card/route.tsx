import { createBrandSocialImage } from "@/lib/brand-image";
import { SITE_DESCRIPTION } from "@/lib/site";

export const runtime = "nodejs";

function clean(value: string | null, fallback: string, limit: number) {
  const normalized = String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return (normalized || fallback).slice(0, limit);
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const title = clean(url.searchParams.get("title"), "Lethela — Siyashesha", 92);
  const description = clean(url.searchParams.get("description"), SITE_DESCRIPTION, 190);
  const response = createBrandSocialImage({ title, description });
  response.headers.set(
    "Cache-Control",
    "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
  );
  response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  return response;
}
