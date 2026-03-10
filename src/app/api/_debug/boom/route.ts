// /src/app/api/_debug/boom/route.ts
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  try {
    throw new Error("Lethela test crash from /api/_debug/boom");
  } catch (err) {
    Sentry.captureException(err);
    // Deliberately still return a 500 so you can see error boundary behavior in logs
    return NextResponse.json({ ok: false, error: "Boom!" }, { status: 500 });
  }
}
