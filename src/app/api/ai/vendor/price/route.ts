// /src/app/api/ai/vendor/price/route.ts
import { NextResponse } from "next/server";
import { aiChat } from "@/lib/ai";

export async function POST(req: Request) {
  const { name, description, currentPriceCents } = await req.json().catch(() => ({})) as {
    name?: string; description?: string; currentPriceCents?: number;
  };

  const messages = [
    { role: "system", content: "You are a pricing assistant for a South African food delivery app. Return a fair, round ZAR price as an integer (e.g. 89, 119), considering value perception. Do not add currency symbols, just the number. Prefer 9-ending pricing (e.g. 89, 99, 109)." },
    { role: "user", content: `Name: ${name}\nDescription: ${description}\nCurrent price cents: ${currentPriceCents ?? "n/a"}` },
  ] as const;

  const out = await aiChat([...messages] as any);
  const n = (out.match(/\d+/)?.[0]) ? parseInt(out.match(/\d+/)![0], 10) : 99;
  const priceCents = Math.max(10, n) * 100; // safety
  return NextResponse.json({ ok: true, suggestedPriceCents: priceCents });
}
