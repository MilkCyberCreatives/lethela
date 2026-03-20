import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserExperienceSnapshot } from "@/lib/customer-experience";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const visitorId = (await cookies()).get(VISITOR_COOKIE_NAME)?.value?.trim() || null;
  const snapshot = await getUserExperienceSnapshot(session.user.id, visitorId);
  return NextResponse.json({ ok: true, snapshot });
}
