// /src/app/api/ai/search/route.ts
import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/search";
import { checkRateLimit } from "@/lib/rate-limit";

async function runSearch(rawQuery: string) {
  const query = String(rawQuery || "").trim().slice(0, 180);
  if (!query) {
    return NextResponse.json({ ok: true, results: [], q: "" });
  }

  const results = await searchCatalog(query, { limit: 16 });
  return NextResponse.json({
    ok: true,
    q: query,
    results: results.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      subtitle: row.subtitle,
      image: row.image,
      vendor: row.vendorName,
      slug: row.slug,
      priceCents: row.priceCents,
      isAlcohol: row.isAlcohol,
      score: Number(row.score.toFixed(4)),
    })),
  });
}

export async function GET(req: Request) {
  const limited = checkRateLimit({
    key: "ai-search",
    limit: 30,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many search requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const url = new URL(req.url);
  return runSearch(url.searchParams.get("q") || "");
}

export async function POST(req: Request) {
  const limited = checkRateLimit({
    key: "ai-search",
    limit: 30,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many search requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const { q } = (await req.json().catch(() => ({}))) as { q: string };
  return runSearch(String(q || ""));
}
