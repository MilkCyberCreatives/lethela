// /src/app/api/ai/recommend/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { aiRecommend } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";
import { getVisitorProfile } from "@/lib/visitor-profile";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor";

export async function POST(req: Request) {
  const limited = await checkRateLimit({
    key: "ai-recommend",
    limit: 20,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many recommendation requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const { suburb } = (await req.json().catch(() => ({}))) as { suburb?: string | null };
  const visitorId = (await cookies()).get(VISITOR_COOKIE_NAME)?.value?.trim() || "";
  const profile = await getVisitorProfile(visitorId || null);
  const out = await aiRecommend(suburb ?? null, profile);
  return NextResponse.json(out, {
    headers: {
      "cache-control": "public, max-age=120, s-maxage=600, stale-while-revalidate=1800",
    },
  });
}
