import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAutomatedUserAgent } from "@/lib/bot-detect";
import { META_EVENT_NAMES, type MetaEventName } from "@/lib/meta-pixel";
import { checkRateLimit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site";

const GRAPH_API_VERSION = "v21.0";
const ALLOWED = new Set<string>(META_EVENT_NAMES);

function metaConfig() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
  const token = process.env.META_CONVERSIONS_API_TOKEN?.trim() || "";
  return pixelId && token ? { pixelId, token } : null;
}

function sameSiteUrl(value: unknown) {
  try {
    const url = new URL(String(value || ""));
    return url.origin === new URL(SITE_URL).origin ? url.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}

function cleanParams(raw: unknown) {
  const params = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (typeof params.value === "number" && Number.isFinite(params.value)) {
    out.value = Math.max(0, Math.min(params.value, 100_000));
  }
  if (typeof params.currency === "string") out.currency = params.currency.slice(0, 3).toUpperCase();
  if (Array.isArray(params.content_ids)) {
    out.content_ids = params.content_ids.slice(0, 20).map((id) => String(id).slice(0, 64));
  }
  for (const key of ["content_name", "content_type", "search_string"]) {
    if (typeof params[key] === "string") out[key] = (params[key] as string).slice(0, 100);
  }
  if (typeof params.num_items === "number") out.num_items = Math.min(params.num_items, 500);
  return out;
}

// Server copy of the browser pixel events (Meta Conversions API), so Facebook and
// Instagram ad audiences still fill when ad blockers stop the pixel. The browser
// only calls this after the visitor accepted cookies. No names, emails or phone
// numbers are sent: only the Meta browser cookies, IP address and browser.
export async function POST(req: Request) {
  const config = metaConfig();
  if (!config) return NextResponse.json({ ok: true, sent: false });

  const userAgent = req.headers.get("user-agent")?.slice(0, 400) || "";
  if (isAutomatedUserAgent(userAgent)) return NextResponse.json({ ok: true, sent: false });

  const limited = await checkRateLimit({
    key: "meta-events",
    limit: 60,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) return NextResponse.json({ ok: false }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    eventId?: string;
    params?: unknown;
    url?: string;
  };
  const name = String(body.name || "");
  const eventId = String(body.eventId || "").slice(0, 100);
  const url = sameSiteUrl(body.url);
  if (!ALLOWED.has(name) || !eventId || !url) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const cookieStore = await cookies();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  const userData: Record<string, string> = { client_user_agent: userAgent };
  if (ip) userData.client_ip_address = ip;
  const fbp = cookieStore.get("_fbp")?.value;
  const fbc = cookieStore.get("_fbc")?.value;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: name as MetaEventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: url,
        action_source: "website",
        user_data: userData,
        custom_data: cleanParams(body.params),
      },
    ],
  };
  const testCode = process.env.META_TEST_EVENT_CODE?.trim();
  if (testCode) payload.test_event_code = testCode;

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.pixelId}/events?access_token=${encodeURIComponent(config.token)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5_000),
    },
  ).catch(() => null);

  if (!response?.ok) {
    const detail = response ? await response.text().catch(() => "") : "no response";
    console.warn("Meta Conversions API event not accepted.", detail.slice(0, 300));
    return NextResponse.json({ ok: true, sent: false });
  }
  return NextResponse.json({ ok: true, sent: true });
}
