import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listNotifications, markNotificationsRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const { items, unreadCount } = await listNotifications(session.user.id);
  return NextResponse.json(
    { ok: true, notifications: items, unreadCount },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const id = typeof payload?.id === "string" ? payload.id : undefined;
  const all = payload?.all === true;

  if (!id && !all) {
    return NextResponse.json({ ok: false, error: "Provide an id or all: true." }, { status: 400 });
  }

  const result = await markNotificationsRead(session.user.id, { id, all });
  const { unreadCount } = await listNotifications(session.user.id);
  return NextResponse.json({ ok: true, updated: result.count, unreadCount });
}
