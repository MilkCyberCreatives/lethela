import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAdminAccessToken, ADMIN_ACCESS_COOKIE_NAME } from "@/lib/admin-access";
import { prisma } from "@/lib/db";

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
  const configuredKey = process.env.ADMIN_APPROVAL_KEY?.trim();
  if (!configuredKey) {
    return NextResponse.json(
      { ok: false, error: "Admin approval key is not configured." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter a valid admin approval key." }, { status: 400 });
  }

  if (!keysMatch(parsed.data.adminKey, configuredKey)) {
    return NextResponse.json({ ok: false, error: "Invalid admin approval key." }, { status: 401 });
  }

  const session = await auth().catch(() => null);
  let promoted = false;
  let message = "Admin access enabled for this browser.";

  if (session?.user?.id && session.user.role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount === 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role: "ADMIN" },
      });
      promoted = true;
      message = "Admin access enabled. Sign out and sign back in once to refresh your admin session.";
    }
  }

  const response = NextResponse.json({
    ok: true,
    promoted,
    message,
  });

  response.cookies.set(ADMIN_ACCESS_COOKIE_NAME, createAdminAccessToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

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
