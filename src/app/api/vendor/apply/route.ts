import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "This legacy vendor application route is no longer supported. Use /api/vendors/register.",
    },
    { status: 410 }
  );
}
