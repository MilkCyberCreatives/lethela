// /src/app/api/ai/rerank/route.ts
import { NextResponse } from "next/server";
import { aiRerankVendors, type RerankInput } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = checkRateLimit({
    key: "ai-rerank",
    limit: 20,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many rerank requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const body = (await req.json().catch(() => ({}))) as RerankInput;
  if (!body?.vendors) return NextResponse.json({ ok: false, error: "vendors required" }, { status: 400 });
  const out = await aiRerankVendors(body);
  return NextResponse.json(out);
}
