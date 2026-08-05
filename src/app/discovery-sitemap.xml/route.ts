import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400;

function xmlEscape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export async function GET() {
  const routes = [
    { path: "/areas/klipfontein-view", changeFrequency: "weekly", priority: "0.82" },
    { path: "/pricing", changeFrequency: "monthly", priority: "0.65" },
  ];
  const lastModified = "2026-08-05";
  const urls = routes
    .map(
      (route) => `  <url>
    <loc>${xmlEscape(`${SITE_URL}${route.path}`)}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${route.changeFrequency}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
    )
    .join("\n");

  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,
    {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=86400, s-maxage=86400",
      },
    },
  );
}
