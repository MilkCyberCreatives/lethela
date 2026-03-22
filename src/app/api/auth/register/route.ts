import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const RegisterSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(200),
  role: z.enum(["USER", "VENDOR", "RIDER"]).default("USER"),
});

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
      { status: 429, headers: { "retry-after": String(rateLimit.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password, role } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return NextResponse.json({ ok: true, user });
}
