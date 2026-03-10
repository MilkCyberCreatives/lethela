// /src/app/api/ai/moderate/route.ts
import { NextResponse } from "next/server";
import { aiModerateProduct } from "@/lib/ai";

export async function POST(req: Request) {
  const { name, description } = (await req.json().catch(() => ({}))) as { name: string; description?: string | null };
  if (!name) return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
  const out = await aiModerateProduct(name, description);
  return NextResponse.json(out);
}
