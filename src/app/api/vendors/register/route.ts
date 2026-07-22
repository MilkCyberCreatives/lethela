import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { VENDOR_STATUS } from "@/lib/vendor-readiness";
import { auth } from "@/auth";
import { isUniqueConstraintError, MinimalRegistrationSchema } from "@/lib/registration-schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }
  const membership = await prisma.vendorMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      vendor: {
        select: { id: true, name: true, slug: true, status: true, isActive: true, updatedAt: true },
      },
    },
  });
  if (!membership) {
    return NextResponse.json({ ok: false, error: "Vendor profile not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, vendor: membership.vendor });
}

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit({
    key: "vendors-register",
    limit: 8,
    windowMs: 60 * 60 * 1000,
    headers: req.headers,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many vendor registrations. Please try again later." },
      { status: 429, headers: { "retry-after": String(rateLimit.retryAfterSec) } },
    );
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = MinimalRegistrationSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Enter a valid email and a secure password.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true },
  });
  if (existingUser) {
    return NextResponse.json(
      { ok: false, error: "We could not create this account. Try signing in instead." },
      { status: 409 },
    );
  }
  const passwordHash = await hash(payload.password, 12);
  const slug = `vendor-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  try {
    const { vendor } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: payload.email,
          passwordHash,
          role: "VENDOR",
        },
        select: { id: true },
      });
      const vendor = await tx.vendor.create({
        data: {
          name: "New vendor",
          slug,
          email: payload.email,
          ownerId: user.id,
          status: VENDOR_STATUS.DRAFT,
          isActive: false,
          cuisine: "[]",
        },
        select: { id: true, name: true, slug: true, status: true, isActive: true },
      });
      await tx.vendorMember.create({
        data: { vendorId: vendor.id, userId: user.id, role: "OWNER" },
      });
      return { vendor };
    });

    return NextResponse.json({
      ok: true,
      message: "Draft vendor account created. Complete your profile in the dashboard.",
      vendor,
      redirectTo: "/vendors/dashboard?tab=profile&welcome=1",
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
