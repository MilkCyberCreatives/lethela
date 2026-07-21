import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const RequestSchema = z.object({
  type: z.enum(["ACCESS", "CORRECTION", "CLOSURE"]),
  details: z.string().trim().max(1000).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }
  const requests = await prisma.privacyRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, type: true, status: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ ok: true, requests });
}

export async function POST(req: Request) {
  const limited = await checkRateLimit({
    key: "privacy-request",
    limit: 5,
    windowMs: 24 * 60 * 60 * 1000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please contact support if this is urgent." },
      { status: 429 },
    );
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid privacy request." }, { status: 400 });
  }
  const existing = await prisma.privacyRequest.findFirst({
    where: { userId: session.user.id, type: parsed.data.type, status: "OPEN" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, requestId: existing.id, duplicate: true });
  }
  const request = await prisma.privacyRequest.create({
    data: {
      userId: session.user.id,
      type: parsed.data.type,
      details: parsed.data.details || null,
    },
    select: { id: true, type: true, status: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, request });
}
