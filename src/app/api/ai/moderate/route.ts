// /src/app/api/ai/moderate/route.ts
import { NextResponse } from "next/server";
import { aiModerateProduct } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = checkRateLimit({
    key: "ai-moderate",
    limit: 25,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many moderation requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const { name, description } = (await req.json().catch(() => ({}))) as { name: string; description?: string | null };
  if (!name) return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
  const out = await aiModerateProduct(name, description);
  return NextResponse.json(out);
}
