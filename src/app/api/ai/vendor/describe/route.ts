// /src/app/api/ai/vendor/describe/route.ts
import { NextResponse } from "next/server";
import { aiChat } from "@/lib/ai";
import { requireVendor } from "@/lib/authz";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    await requireVendor("STAFF");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Vendor access required.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }

  const limited = checkRateLimit({
    key: "ai-vendor-describe",
    limit: 60,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many AI description requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const { name, keyNotes } = await req.json().catch(() => ({})) as {
    name?: string; keyNotes?: string;
  };

  const messages = [
    { role: "system", content: "You write short, enticing food/product descriptions for a South African delivery app. Keep it under 45 words. Plain text. No emojis." },
    { role: "user", content: `Product name: ${name ?? "Unknown"}\nNotes: ${keyNotes ?? "-"}` },
  ] as const;

  const reply = await aiChat([...messages] as any);
  return NextResponse.json({ ok: true, description: String(reply || "").trim().slice(0, 400) });
}
