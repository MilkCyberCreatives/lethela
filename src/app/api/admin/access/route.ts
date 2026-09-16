import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAdminAccessToken, ADMIN_ACCESS_COOKIE_NAME } from "@/lib/admin-access";
import { isAdminRole } from "@/lib/auth-security";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const BodySchema = z.object({
  adminKey: z.string().trim().optional(),
});

const PRIVATE_HEADERS = {
  "cache-control": "private, no-store, max-age=0, must-revalidate",
  pragma: "no-cache",
  expires: "0",
  "x-robots-tag": "noindex, nofollow, noarchive, nosnippet",
};

function json(
  body: Record<string, unknown>,
  status = 200,
  additionalHeaders: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: { ...PRIVATE_HEADERS, ...additionalHeaders },
  });
}

function keysMatch(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

function configuredBootstrapEmails() {
  return (process.env.ADMIN_BOOTSTRAP_EMAILS || process.env.ADMIN_NOTIFICATION_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function withAdminAccessCookie(response: NextResponse, userId: string) {
  response.cookies.set(
    ADMIN_ACCESS_COOKIE_NAME,
    createAdminAccessToken({ userId, expiresInHours: 8 }),
    {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 8 * 60 * 60,
    },
  );
  return response;
}

export async function POST(req: NextRequest) {
  const rateLimit = await checkRateLimit({
    key: "admin-access",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    headers: req.headers,
  });
  if (!rateLimit.ok) {
    return json(
      { ok: false, error: "Too many admin access attempts. Please try again later." },
      429,
      { "retry-after": String(rateLimit.retryAfterSec) },
    );
  }

  const authSecret = process.env.NEXTAUTH_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && !authSecret) {
    return json({ ok: false, error: "Secure admin access is not fully configured." }, 503);
  }

  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return json(
      {
        ok: false,
        error: "Sign in with an authorised staff account before opening admin operations.",
      },
      401,
    );
  }

  if (isAdminRole(session.user.role)) {
    return withAdminAccessCookie(
      json({
        ok: true,
        promoted: false,
        message: "Admin access enabled for this browser.",
      }),
      session.user.id,
    );
  }

  const configuredKey = process.env.ADMIN_APPROVAL_KEY?.trim();
  if (!configuredKey) {
    return json({ ok: false, error: "Owner recovery is not fully configured." }, 503);
  }

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  const providedKey = parsed.success ? parsed.data.adminKey?.trim() || "" : "";
  if (!providedKey) {
    return json({ ok: false, error: "Enter a valid admin approval key." }, 400);
  }

  if (!keysMatch(providedKey, configuredKey)) {
    return json({ ok: false, error: "Invalid admin approval key." }, 401);
  }

  const adminCount = await prisma.user.count({ where: { role: { in: ["OWNER", "ADMIN"] } } });
  if (adminCount !== 0) {
    return json({ ok: false, error: "This account is not authorised for the admin dashboard." }, 403);
  }

  const allowedEmails = configuredBootstrapEmails();
  const sessionEmail = session.user.email?.trim().toLowerCase() || "";

  if (process.env.NODE_ENV === "production" && allowedEmails.length === 0) {
    return json({ ok: false, error: "Owner bootstrap email allowlist is not configured." }, 503);
  }

  if (allowedEmails.length > 0 && !allowedEmails.includes(sessionEmail)) {
    return json(
      { ok: false, error: "This account is not authorised to initialise owner access." },
      403,
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: "OWNER", twoFactorEnabled: true, sessionVersion: { increment: 1 } },
  });

  return withAdminAccessCookie(
    json({
      ok: true,
      promoted: true,
      message: "Owner access enabled. Sign out and sign back in once to refresh your owner session.",
    }),
    session.user.id,
  );
}

export async function DELETE() {
  const response = json({ ok: true });
  response.cookies.set(ADMIN_ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
