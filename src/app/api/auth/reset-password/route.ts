import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/server/db";
import {
  passwordResetFingerprint,
  readPasswordResetToken,
} from "@/lib/password-reset";

const BodySchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(6).max(200),
    confirmPassword: z.string().min(6).max(200),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = readPasswordResetToken(parsed.data.token);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Reset link is invalid or expired." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!user?.passwordHash || user.email.toLowerCase() !== payload.email.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "Reset link is invalid or expired." }, { status: 400 });
  }

  if (passwordResetFingerprint(user.passwordHash) !== payload.pw) {
    return NextResponse.json({ ok: false, error: "Reset link is invalid or expired." }, { status: 400 });
  }

  const passwordHash = await hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true, message: "Password updated. You can now sign in." });
}
