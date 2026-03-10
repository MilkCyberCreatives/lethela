// /src/app/api/ai/rerank/route.ts
import { NextResponse } from "next/server";
import { aiRerankVendors, type RerankInput } from "@/lib/ai";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RerankInput;
  if (!body?.vendors) return NextResponse.json({ ok: false, error: "vendors required" }, { status: 400 });
  const out = await aiRerankVendors(body);
  return NextResponse.json(out);
}
