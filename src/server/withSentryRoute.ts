import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { logError } from "@/lib/logger";

type Handler = (req: NextRequest, ctx: any) => Promise<Response | NextResponse>;

export function withSentryRoute(handler: Handler): Handler {
  return async (req, ctx) => {
    const start = Date.now();

    try {
      return await handler(req, ctx);
    } catch (err: any) {
      logError("API route crashed", {
        path: req.url,
        error: String(err?.message || err),
      });
      Sentry.captureException(err, { tags: { route: req.url } });
      return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
    } finally {
      const ms = Date.now() - start;
      // Lightweight timing that also shows up in Vercel logs.
      console.log(`[API ${req.method}] ${req.url} - ${ms}ms`);
    }
  };
}
