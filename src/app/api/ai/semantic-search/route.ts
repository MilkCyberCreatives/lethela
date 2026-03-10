// /src/app/api/ai/semantic-search/route.ts
import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/search";

export async function POST(req: Request) {
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
