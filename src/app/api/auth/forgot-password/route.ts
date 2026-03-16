import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import {
  createPasswordResetToken,
  passwordResetEmailConfigured,
  resolveAppBaseUrl,
  sendPasswordResetEmail,
} from "@/lib/password-reset";

const BodySchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, name: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json({
      ok: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  }

  const token = createPasswordResetToken({
    userId: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
  });

  const baseUrl = resolveAppBaseUrl(req.nextUrl.origin);
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  if (!passwordResetEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        ok: true,
        message: "Password reset email is not configured. Use the reset link below for local testing.",
        resetUrl,
      });
    }

    return NextResponse.json(
      { ok: false, error: "Password reset email is not configured." },
      { status: 500 }
    );
  }

  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
  });

  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, a reset link has been sent.",
  });
}
