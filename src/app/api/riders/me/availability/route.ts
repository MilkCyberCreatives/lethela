import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const BodySchema = z.object({ availableNow: z.boolean() });

async function riderApplication(userId: string, email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase() || null;
  return prisma.riderApplication.findFirst({
    where: {
      OR: [{ userId }, ...(normalizedEmail ? [{ email: normalizedEmail }] : [])],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      availableNow: true,
      suburb: true,
      city: true,
      fullName: true,
    },
  });
}

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id || (session.user.role !== "RIDER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ ok: false, error: "Rider access required." }, { status: 401 });
  }

  const application = await riderApplication(session.user.id, session.user.email);
  if (!application) {
    return NextResponse.json({ ok: false, error: "Rider profile not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    availableNow: application.availableNow,
    approved: application.status === "APPROVED" || session.user.role === "ADMIN",
    area: [application.suburb, application.city].filter(Boolean).join(", ") || null,
  });
}

export async function PATCH(req: NextRequest) {
  const limited = await checkRateLimit({
    key: "rider-availability",
    limit: 30,
    windowMs: 15 * 60 * 1000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many availability changes. Please try again shortly." },
      { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } },
    );
  }

  const session = await auth().catch(() => null);
  if (!session?.user?.id || (session.user.role !== "RIDER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ ok: false, error: "Rider access required." }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid availability status." }, { status: 400 });
  }

  const application = await riderApplication(session.user.id, session.user.email);
  if (!application) {
    return NextResponse.json({ ok: false, error: "Rider profile not found." }, { status: 404 });
  }
  if (application.status !== "APPROVED" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Rider approval is required before going online." },
      { status: 409 },
    );
  }

  const updated = await prisma.riderApplication.update({
    where: { id: application.id },
    data: { availableNow: parsed.data.availableNow },
    select: { availableNow: true, suburb: true, city: true },
  });

  return NextResponse.json({
    ok: true,
    availableNow: updated.availableNow,
    area: [updated.suburb, updated.city].filter(Boolean).join(", ") || null,
  });
}
