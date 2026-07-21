import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { VENDOR_STATUS } from "@/lib/vendor-readiness";
import { auth } from "@/auth";

const RegisterVendorSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z
      .string()
      .email()
      .transform((value) => value.trim().toLowerCase()),
    storeName: z.string().trim().min(2).max(120),
    password: z.string().min(8).max(200),
    confirmPassword: z.string().min(8).max(200),
    acceptTerms: z.literal(true),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
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
  const parsed = RegisterVendorSchema.safeParse({
    fullName: raw?.fullName ?? raw?.name,
    email: raw?.email,
    storeName: raw?.storeName ?? raw?.businessName,
    password: raw?.password,
    confirmPassword: raw?.confirmPassword,
    acceptTerms: raw?.acceptTerms,
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
  const slug = await ensureUniqueSlug(payload.storeName);
  const { vendor } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: payload.fullName,
        email: payload.email,
        passwordHash,
        role: "VENDOR",
      },
      select: { id: true },
    });
    const vendor = await tx.vendor.create({
      data: {
        name: payload.storeName,
        slug,
        email: payload.email,
        ownerId: user.id,
        status: VENDOR_STATUS.DRAFT,
        isActive: false,
        cuisine: "[]",
      },
      select: { id: true, name: true, slug: true, status: true, isActive: true },
    });
    await tx.vendorMember.create({ data: { vendorId: vendor.id, userId: user.id, role: "OWNER" } });
    return { vendor };
  });

  const response = NextResponse.json({
    ok: true,
    message: "Draft vendor profile created. Complete your dashboard checklist next.",
    vendor,
    redirectTo: "/vendors/dashboard",
  });
  return response;
}
