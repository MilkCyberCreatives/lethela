import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "This legacy rider application route is no longer supported. Use /api/riders/register.",
    },
    { status: 410 },
  );
}
