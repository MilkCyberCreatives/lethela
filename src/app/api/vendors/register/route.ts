import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { attachVendorSession } from "@/lib/vendor-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { VENDOR_STATUS, isApprovedVendorStatus } from "@/lib/vendor-readiness";

const RegisterVendorSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z
    .string()
    .email()
    .transform((value) => value.trim().toLowerCase()),
  storeName: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(200),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function isLocalSqliteRuntime() {
  return (
    !process.env.VERCEL &&
    (process.env.DATABASE_PROVIDER?.trim().toLowerCase() === "sqlite" ||
      process.env.DATABASE_URL?.trim().toLowerCase().startsWith("file:"))
  );
}

async function ensureUniqueSlug(baseName: string) {
  const base = slugify(baseName) || "vendor";
  let slug = base;
  let idx = 1;
  while (await prisma.vendor.findUnique({ where: { slug }, select: { id: true } })) {
    idx += 1;
    slug = `${base}-${idx}`;
  }
  return slug;
}

export async function GET() {
  const cookieStore = await cookies();
  const email = cookieStore.get("vendor_email")?.value?.toLowerCase().trim();
  const slug = cookieStore.get("vendor_slug")?.value?.trim();

  if (!email && !slug) {
    return NextResponse.json(
      { ok: false, error: "No vendor profile found in this browser." },
      { status: 404 },
    );
  }

  const vendor = await prisma.vendor.findFirst({
    where: {
      OR: [...(slug ? [{ slug }] : []), ...(email ? [{ email }] : [])],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      isActive: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!vendor) {
    return NextResponse.json({ ok: false, error: "Vendor profile not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    vendor,
    pending: !isApprovedVendorStatus(vendor.status, vendor.isActive),
  });
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
  const parsed = RegisterVendorSchema.safeParse({
    fullName: raw?.fullName ?? raw?.name,
    email: raw?.email,
    storeName: raw?.storeName ?? raw?.businessName,
    password: raw?.password,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please enter your full name, email address, store name and password.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  if (isLocalSqliteRuntime()) {
    const vendor = {
      id: `local-vendor-${Date.now()}`,
      name: payload.storeName,
      slug: slugify(payload.storeName) || "local-vendor",
      status: VENDOR_STATUS.DRAFT,
      isActive: false,
    };

    const response = NextResponse.json({
      ok: true,
      message: "Draft vendor profile created. Complete your dashboard checklist next.",
      vendor,
      redirectTo: "/vendors/dashboard",
    });
    attachVendorSession(response, {
      userId: `local-user-${Date.now()}`,
      vendorId: vendor.id,
      vendorSlug: vendor.slug,
      role: "OWNER",
      email: payload.email,
    });
    return response;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true, name: true, email: true, passwordHash: true, role: true },
  });

  if (existingUser?.passwordHash) {
    const passwordMatches = await compare(payload.password, existingUser.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json(
        { ok: false, error: "This email already exists. Sign in or use the correct password." },
        { status: 409 },
      );
    }
  }

  const passwordHash = existingUser?.passwordHash || (await hash(payload.password, 10));
  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: existingUser.name || payload.fullName,
          passwordHash,
          role: existingUser.role === "ADMIN" ? "ADMIN" : "VENDOR",
        },
        select: { id: true, email: true },
      })
    : await prisma.user.create({
        data: {
          name: payload.fullName,
          email: payload.email,
          passwordHash,
          role: "VENDOR",
        },
        select: { id: true, email: true },
      });

  const existingVendor = await prisma.vendor.findFirst({
    where: { OR: [{ email: payload.email }, { ownerId: user.id }] },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, status: true, isActive: true, ownerId: true },
  });

  if (existingVendor?.ownerId && existingVendor.ownerId !== user.id) {
    return NextResponse.json(
      { ok: false, error: "This vendor profile is already linked to another owner account." },
      { status: 409 },
    );
  }

  const vendor = existingVendor
    ? await prisma.vendor.update({
        where: { id: existingVendor.id },
        data: {
          name: payload.storeName,
          email: payload.email,
          ownerId: user.id,
          status: isApprovedVendorStatus(existingVendor.status, existingVendor.isActive)
            ? existingVendor.status
            : VENDOR_STATUS.DRAFT,
          isActive: isApprovedVendorStatus(existingVendor.status, existingVendor.isActive),
        },
        select: { id: true, name: true, slug: true, status: true, isActive: true },
      })
    : await prisma.vendor.create({
        data: {
          name: payload.storeName,
          slug: await ensureUniqueSlug(payload.storeName),
          email: payload.email,
          ownerId: user.id,
          status: VENDOR_STATUS.DRAFT,
          isActive: false,
          cuisine: "[]",
        },
        select: { id: true, name: true, slug: true, status: true, isActive: true },
      });

  await prisma.vendorMember.upsert({
    where: { vendorId_userId: { vendorId: vendor.id, userId: user.id } },
    update: { role: "OWNER" },
    create: { vendorId: vendor.id, userId: user.id, role: "OWNER" },
  });

  const response = NextResponse.json({
    ok: true,
    message: "Draft vendor profile created. Complete your dashboard checklist next.",
    vendor,
    redirectTo: "/vendors/dashboard",
  });
  attachVendorSession(response, {
    userId: user.id,
    vendorId: vendor.id,
    vendorSlug: vendor.slug,
    role: "OWNER",
    email: user.email,
  });
  return response;
}
