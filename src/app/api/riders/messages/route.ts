import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listMessagesForRider } from "@/lib/platform-messages";
import { prisma } from "@/server/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  if (session.user.role !== "RIDER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Rider access required." }, { status: 403 });
  }

  const application = await prisma.riderApplication.findFirst({
    where: { email: session.user.email.toLowerCase() },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (!application) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const items = await listMessagesForRider(application.id, 30);
  return NextResponse.json({ ok: true, items });
}
