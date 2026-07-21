import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const RegisterSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z
      .string()
      .email()
      .transform((value) => value.trim().toLowerCase()),
    phone: z.string().trim().min(8).max(30),
    password: z.string().min(8).max(200),
    confirmPassword: z.string().min(8).max(200),
    acceptTerms: z.literal(true),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
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
      { status: 429, headers: { "retry-after": String(rateLimit.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email: normalizedEmail, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "We could not create this account. Try signing in instead." },
      { status: 409 },
    );
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      phone,
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

  return NextResponse.json({ ok: true, user });
}
