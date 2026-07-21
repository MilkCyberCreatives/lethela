// /src/app/api/ai/moderate/route.ts
import { NextResponse } from "next/server";
import { aiModerateProduct } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireVendorAccount } from "@/lib/authz";

export async function POST(req: Request) {
  try {
    await requireVendorAccount("MANAGER");
  } catch {
    return NextResponse.json(
      { ok: false, error: "Vendor manager access required." },
      { status: 401 },
    );
  }
  const limited = await checkRateLimit({
    key: "ai-moderate",
    limit: 25,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many moderation requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const { name: rawName, description: rawDescription } = (await req.json().catch(() => ({}))) as {
    name?: string;
    description?: string | null;
  };
  const name = String(rawName || "")
    .trim()
    .slice(0, 120);
  const description =
    String(rawDescription || "")
      .trim()
      .slice(0, 1200) || null;
  if (name.length < 2)
    return NextResponse.json({ ok: false, error: "Valid name required" }, { status: 400 });
  const out = await aiModerateProduct(name, description);
  return NextResponse.json(out);
}
