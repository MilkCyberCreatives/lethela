import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { attachVendorSession } from "@/lib/vendor-session";

const RegisterVendorSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(200),
  phone: z.string().trim().min(8).max(40),
  address: z.string().trim().min(6).max(240),
  suburb: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  province: z.string().trim().min(2).max(120),
  cuisine: z.array(z.string().trim().min(2).max(40)).min(1).max(8).default([]),
  halaal: z.boolean().optional().default(false),
  etaMins: z.number().int().min(10).max(120).default(30),
  deliveryFeeCents: z.number().int().min(0).max(20_000).default(1500),
  kycIdUrl: z.string().url().optional().nullable(),
  kycProofUrl: z.string().url().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
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
  const cookieStore = await cookies();
  const email = cookieStore.get("vendor_email")?.value?.toLowerCase().trim();
  const slug = cookieStore.get("vendor_slug")?.value?.trim();

  if (!email && !slug) {
    return NextResponse.json({ ok: false, error: "No vendor application found in this session." }, { status: 404 });
  }

  const vendor = await prisma.vendor.findFirst({
    where: {
      OR: [
        ...(slug ? [{ slug }] : []),
        ...(email ? [{ email }] : []),
      ],
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
    return NextResponse.json({ ok: false, error: "Vendor application not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    vendor,
    pending: vendor.status !== "ACTIVE" || !vendor.isActive,
  });
}

export async function POST(req: Request) {
  const raw = await req.json().catch(() => ({}));
  const body = {
    ...raw,
    cuisine: Array.isArray(raw?.cuisine)
      ? raw.cuisine.map((value: unknown) => String(value || "").trim()).filter(Boolean)
      : typeof raw?.cuisine === "string"
        ? raw.cuisine
            .split(",")
            .map((value: string) => value.trim())
            .filter(Boolean)
        : [],
    halaal: Boolean(raw?.halaal),
    etaMins:
      raw?.etaMins === undefined || raw?.etaMins === null || raw?.etaMins === ""
        ? 30
        : Number(raw.etaMins),
    deliveryFeeCents:
      raw?.deliveryFeeCents === undefined || raw?.deliveryFeeCents === null || raw?.deliveryFeeCents === ""
        ? 1500
        : Number(raw.deliveryFeeCents),
    kycIdUrl: raw?.kycIdUrl ? String(raw.kycIdUrl).trim() : null,
    kycProofUrl: raw?.kycProofUrl ? String(raw.kycProofUrl).trim() : null,
    latitude:
      raw?.latitude === undefined || raw?.latitude === null || raw?.latitude === ""
        ? undefined
        : Number(raw.latitude),
    longitude:
      raw?.longitude === undefined || raw?.longitude === null || raw?.longitude === ""
        ? undefined
        : Number(raw.longitude),
  };

  const parsed = RegisterVendorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid vendor registration data", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      role: true,
    },
  });

  if (existingUser?.passwordHash) {
    const passwordMatches = await compare(payload.password, existingUser.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json(
        { ok: false, error: "This email already has an account. Sign in with the correct password to continue." },
        { status: 409 }
      );
    }
  }

  const passwordHash =
    existingUser?.passwordHash || (await hash(payload.password, 10));

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: existingUser.name || payload.name,
          passwordHash,
          role: existingUser.role === "ADMIN" ? "ADMIN" : "VENDOR",
        },
        select: {
          id: true,
          email: true,
        },
      })
    : await prisma.user.create({
        data: {
          name: payload.name,
          email: payload.email,
          passwordHash,
          role: "VENDOR",
        },
        select: {
          id: true,
          email: true,
        },
      });

  const existingByEmail = await prisma.vendor.findFirst({
    where: { email: payload.email },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      isActive: true,
      ownerId: true,
    },
  });

  if (existingByEmail?.ownerId && existingByEmail.ownerId !== user.id) {
    return NextResponse.json(
      { ok: false, error: "This vendor profile is already linked to another owner account." },
      { status: 409 }
    );
  }

  const existingStatus = String(existingByEmail?.status || "").toUpperCase();
  if (existingByEmail && existingByEmail.isActive && (existingStatus === "ACTIVE" || existingStatus === "APPROVED" || existingStatus === "")) {
    await prisma.vendorMember.upsert({
      where: {
        vendorId_userId: {
          vendorId: existingByEmail.id,
          userId: user.id,
        },
      },
      update: { role: "OWNER" },
      create: {
        vendorId: existingByEmail.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    const response = NextResponse.json({
      ok: true,
      pending: false,
      message: "Vendor is already approved. Open your dashboard.",
      vendor: existingByEmail,
    });
    attachVendorSession(response, {
      userId: user.id,
      vendorId: existingByEmail.id,
      vendorSlug: existingByEmail.slug,
      role: "OWNER",
      email: user.email,
    });
    return response;
  }

  const vendor = existingByEmail
    ? await prisma.vendor.update({
        where: { id: existingByEmail.id },
        data: {
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          address: payload.address,
          suburb: payload.suburb,
          city: payload.city,
          province: payload.province,
          cuisine: JSON.stringify(payload.cuisine),
          halaal: payload.halaal,
          etaMins: payload.etaMins,
          deliveryFee: payload.deliveryFeeCents,
          kycIdUrl: payload.kycIdUrl || null,
          kycProofUrl: payload.kycProofUrl || null,
          latitude: payload.latitude,
          longitude: payload.longitude,
          ownerId: user.id,
          status: "PENDING",
          isActive: false,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          isActive: true,
        },
      })
    : await prisma.vendor.create({
        data: {
          name: payload.name,
          slug: await ensureUniqueSlug(payload.name),
          email: payload.email,
          phone: payload.phone,
          address: payload.address,
          suburb: payload.suburb,
          city: payload.city,
          province: payload.province,
          cuisine: JSON.stringify(payload.cuisine),
          halaal: payload.halaal,
          etaMins: payload.etaMins,
          deliveryFee: payload.deliveryFeeCents,
          kycIdUrl: payload.kycIdUrl || null,
          kycProofUrl: payload.kycProofUrl || null,
          latitude: payload.latitude,
          longitude: payload.longitude,
          ownerId: user.id,
          status: "PENDING",
          isActive: false,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          isActive: true,
        },
      });

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

  const response = NextResponse.json({
    ok: true,
    pending: true,
    message: "Application submitted. An admin must approve your vendor before it goes live.",
    vendor,
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
