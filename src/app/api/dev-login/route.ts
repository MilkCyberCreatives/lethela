// src/app/api/dev-login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { attachVendorSession } from "@/lib/vendor-session";

// IMPORTANT: this route is for development / internal use only.
// In production you should restrict or remove it.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { email, slug } = body as { email?: string; slug?: string };

  if (!email || !slug) {
    return NextResponse.json(
      { ok: false, error: "Missing email or slug" },
      { status: 400 }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  // make sure vendor exists
  const vendor = await prisma.vendor.findUnique({
    where: { slug },
  });

  if (!vendor) {
    return NextResponse.json(
      { ok: false, error: "Vendor not found for that slug" },
      { status: 404 }
    );
  }

  // upsert user
  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {},
    create: { email: normalizedEmail },
  });

  // upsert membership, force OWNER in dev
  await prisma.vendorMember.upsert({
    where: {
      vendorId_userId: {
        vendorId: vendor.id,
        userId: user.id,
      },
    },
    update: {
      role: "OWNER",
    },
    create: {
      vendorId: vendor.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  const response = NextResponse.json({
    ok: true,
    message: `Session established. You are now OWNER of ${vendor.slug}.`,
  });
  attachVendorSession(response, {
    userId: user.id,
    vendorId: vendor.id,
    vendorSlug: vendor.slug,
    role: "OWNER",
    email: normalizedEmail,
  });

  return response;
}
