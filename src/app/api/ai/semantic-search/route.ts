// /src/app/api/ai/semantic-search/route.ts
import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/search";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = checkRateLimit({
    key: "ai-semantic-search",
    limit: 30,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many semantic search requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const { q } = await req.json().catch(() => ({ q: "" }));
  const query = String(q || "").trim().slice(0, 180);

  if (!query) {
    return NextResponse.json({ ok: true, q: "", results: [] });
  }

  const results = await searchCatalog(query, { limit: 12 });
  return NextResponse.json({
    ok: true,
    q: query,
    results: results.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      image: row.image,
      slug: row.slug,
      vendorName: row.vendorName,
      subtitle: row.subtitle,
      score: Number(row.score.toFixed(4)),
      priceCents: row.priceCents,
      isAlcohol: row.isAlcohol,
    })),
  });
}
