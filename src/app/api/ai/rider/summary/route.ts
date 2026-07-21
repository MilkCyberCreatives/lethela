// src/app/api/ai/rider/summary/route.ts
import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "This legacy AI route is retired. Complete the secure rider profile instead.",
    },
    { status: 410 },
  );
}
