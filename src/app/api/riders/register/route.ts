import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { isUniqueConstraintError, MinimalRegistrationSchema } from "@/lib/registration-schema";

export async function POST(req: Request) {
  const limited = await checkRateLimit({
    key: "riders-register",
    limit: 6,
    windowMs: 60 * 60 * 1000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many registration attempts. Please try again later." },
      { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = MinimalRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Check your details and try again.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "We could not create this account. Try signing in instead." },
      { status: 409 },
    );
  }

  const passwordHash = await hash(parsed.data.password, 12);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: parsed.data.email,
          passwordHash,
          role: "RIDER",
        },
        select: { id: true, email: true, name: true, role: true },
      });
      const profile = await tx.riderApplication.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          fullName: "",
          email: parsed.data.email,
          phone: "",
          status: "DRAFT",
        },
        select: { id: true, status: true },
      });
      return { user, profile };
    });

    return NextResponse.json({
      ok: true,
      ...result,
      message: "Rider account created. Complete your profile in the dashboard.",
      redirectTo: "/rider/dashboard/profile?welcome=1",
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { ok: false, error: "We could not create this account. Try signing in instead." },
        { status: 409 },
      );
    }
    throw error;
  }
}
