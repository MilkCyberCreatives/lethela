// /src/app/api/ai/recommend/route.ts
import { NextResponse } from "next/server";
import { aiRecommend } from "@/lib/ai";

export async function POST(req: Request) {
  const { suburb } = (await req.json().catch(() => ({}))) as { suburb?: string | null };
  const out = await aiRecommend(suburb ?? null);
  return NextResponse.json(out, {
    headers: {
      "cache-control": "public, max-age=120, s-maxage=600, stale-while-revalidate=1800",
    },
  });
}
