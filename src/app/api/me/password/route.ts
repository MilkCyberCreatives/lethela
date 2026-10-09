import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuthSecurityEvent } from "@/lib/auth-security";
import { AccountPasswordSchema } from "@/lib/registration-schema";

const BodySchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(200),
    password: AccountPasswordSchema,
    confirmPassword: AccountPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const rateLimit = await checkRateLimit({
    key: `me-password:${session.user.id}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
    headers: req.headers,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "retry-after": String(rateLimit.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: issue?.message || "Check the password fields and try again." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, error: "Account not found." }, { status: 404 });
  }
  if (!user.passwordHash) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "This account signs in with Google. Use Forgot password on the sign-in page to add a password.",
      },
      { status: 400 },
    );
  }

  const currentMatches = await compare(parsed.data.currentPassword, user.passwordHash);
  if (!currentMatches) {
    await recordAuthSecurityEvent({
      userId: user.id,
      email: user.email,
      eventType: "PASSWORD_CHANGE",
      outcome: "FAILED",
    });
    return NextResponse.json(
      { ok: false, error: "Your current password is not correct." },
      { status: 400 },
    );
  }

  const passwordHash = await hash(parsed.data.password, 12);
  // Bumping sessionVersion signs the account out everywhere, including this browser.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      sessionVersion: { increment: 1 },
    },
  });
  await recordAuthSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "PASSWORD_CHANGE",
    outcome: "SUCCESS",
  });

  return NextResponse.json({
    ok: true,
    message: "Password changed. Please sign in again with your new password.",
  });
}
