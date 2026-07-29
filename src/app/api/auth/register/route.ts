import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { isUniqueConstraintError, MinimalRegistrationSchema } from "@/lib/registration-schema";

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit({
    key: "auth-register",
    limit: 10,
    windowMs: 60 * 60 * 1000,
    headers: req.headers,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many sign-up attempts. Please try again later." },
      { status: 429, headers: { "retry-after": String(rateLimit.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = MinimalRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { email: normalizedEmail, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "We could not create this account. Try signing in instead." },
      { status: 409 },
    );
  }

  const passwordHash = await hash(password, 12);
  try {
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: "CUSTOMER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json({ ok: true, user, redirectTo: "/profile?welcome=1" });
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
