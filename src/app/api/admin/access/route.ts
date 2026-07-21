import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAdminAccessToken, ADMIN_ACCESS_COOKIE_NAME } from "@/lib/admin-access";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { isAdminRole } from "@/lib/auth-security";

const BodySchema = z.object({
  adminKey: z.string().trim().min(1),
});

function keysMatch(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export async function POST(req: NextRequest) {
  const rateLimit = await checkRateLimit({
    key: "admin-access",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    headers: req.headers,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many admin access attempts. Please try again later." },
      { status: 429, headers: { "retry-after": String(rateLimit.retryAfterSec) } },
    );
  }

  const configuredKey = process.env.ADMIN_APPROVAL_KEY?.trim();
  if (!configuredKey) {
    return NextResponse.json(
      { ok: false, error: "Admin approval key is not configured." },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid admin approval key." },
      { status: 400 },
    );
  }

  if (!keysMatch(parsed.data.adminKey, configuredKey)) {
    return NextResponse.json({ ok: false, error: "Invalid admin approval key." }, { status: 401 });
  }

  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json(
      {
        ok: false,
        error: "Sign in with an authorised staff account before entering the security key.",
      },
      { status: 401 },
    );
  }
  let promoted = false;
  let message = "Admin access enabled for this browser.";

  if (!isAdminRole(session.user.role)) {
    const adminCount = await prisma.user.count({ where: { role: { in: ["OWNER", "ADMIN"] } } });
    if (adminCount === 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role: "OWNER", twoFactorEnabled: true, sessionVersion: { increment: 1 } },
      });
      promoted = true;
      message =
        "Owner access enabled. Sign out and sign back in once to refresh your owner session.";
    } else {
      return NextResponse.json(
        { ok: false, error: "This account is not authorised for the admin dashboard." },
        { status: 403 },
      );
    }
  }

  if (!promoted) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { twoFactorEnabled: true },
    });
  }

  const response = NextResponse.json({
    ok: true,
    promoted,
    message,
  });

  response.cookies.set(
    ADMIN_ACCESS_COOKIE_NAME,
    createAdminAccessToken({ userId: session.user.id, expiresInHours: 8 }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 8 * 60 * 60,
    },
  );

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
