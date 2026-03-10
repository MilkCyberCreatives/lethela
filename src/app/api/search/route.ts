import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/search";

async function runSearch(rawQuery: string) {
  const text = String(rawQuery || "").trim().slice(0, 180);

  if (!text) {
    return NextResponse.json({
      ok: true,
      q: "",
      parsed: { terms: [], numbers: [] },
      results: [],
    });
  }

  const tokens = text.split(/[,\s]+/).filter(Boolean).slice(0, 8);
  const results = await searchCatalog(text, { limit: 10 });

  return NextResponse.json({
    ok: true,
    q: text,
    parsed: {
      terms: tokens.filter((token) => !/\d/.test(token)),
      numbers: tokens.filter((token) => /\d/.test(token)),
    },
    results,
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return runSearch(url.searchParams.get("q") || "");
}

export async function POST(req: Request) {
  try {
    const { q } = await req.json().catch(() => ({ q: "" }));
    return runSearch(String(q || ""));
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}
