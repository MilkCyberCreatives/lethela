import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { attachVendorSession } from "@/lib/vendor-session";
import { checkRateLimit } from "@/lib/rate-limit";

const VendorLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  slug: z.string().trim().min(2).max(120).transform((value) => value.toLowerCase()).optional(),
});

export async function POST(req: Request) {
  const rateLimit = checkRateLimit({
    key: "vendor-login",
    limit: 10,
    windowMs: 30 * 60 * 1000,
    headers: req.headers,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many sign-in attempts. Please try again later." },
      { status: 429, headers: { "retry-after": String(rateLimit.retryAfterSec) } }
    );
  }

  const isDevelopment = process.env.NODE_ENV !== "production";
  const body = await req.json().catch(() => ({}));
  const parsed = VendorLoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter a valid vendor email and password." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Vendor account not found for this email." }, { status: 404 });
  }

  // Local/dev convenience: allow seeded demo users without a password hash to sign in.
  const missingPasswordHash = !user.passwordHash;
  const passwordMatches = user.passwordHash
    ? await compare(parsed.data.password, user.passwordHash)
    : false;
  if (!passwordMatches && !(isDevelopment && missingPasswordHash)) {
    return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
  }

  const vendorWhere = parsed.data.slug
    ? {
        slug: parsed.data.slug,
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
          { email },
        ],
      }
    : {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
          { email },
        ],
      };

  const vendor = await prisma.vendor.findFirst({
    where: vendorWhere,
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      status: true,
      isActive: true,
      ownerId: true,
      members: {
        where: { userId: user.id },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!vendor) {
    return NextResponse.json(
      { ok: false, error: "No vendor profile is linked to this account yet. Apply first on the vendor page." },
      { status: 404 }
    );
  }

  if (!vendor.members.length && vendor.ownerId === user.id) {
    await prisma.vendorMember.upsert({
      where: {
        vendorId_userId: {
          vendorId: vendor.id,
          userId: user.id,
        },
      },
      update: { role: "OWNER" },
      create: {
        vendorId: vendor.id,
        userId: user.id,
        role: "OWNER",
      },
    });
  }

  const role = vendor.members[0]?.role || (vendor.ownerId === user.id ? "OWNER" : "STAFF");
  const response = NextResponse.json({
    ok: true,
    vendor: {
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      status: vendor.status,
      isActive: vendor.isActive,
      role,
    },
    pending: !(
      vendor.isActive &&
      ["ACTIVE", "APPROVED", ""].includes(String(vendor.status || "").toUpperCase())
    ),
  });

  attachVendorSession(response, {
    userId: user.id,
    vendorId: vendor.id,
    vendorSlug: vendor.slug,
    role,
    email: user.email,
  });

  return response;
}
