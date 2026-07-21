import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Use the secure account sign-in page.",
      signInUrl: "/signin?callbackUrl=/vendors/dashboard",
    },
    { status: 410 },
  );
}
