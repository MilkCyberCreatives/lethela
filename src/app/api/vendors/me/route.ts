import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getVendorSession, requireVendor } from "@/lib/authz";

const VendorProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(40),
  address: z.string().trim().min(6).max(240),
  suburb: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  province: z.string().trim().min(2).max(120),
  cuisine: z.array(z.string().trim().min(2).max(40)).min(1).max(8),
  deliveryFee: z.number().int().min(0).max(20_000),
  etaMins: z.number().int().min(10).max(120),
  halaal: z.boolean(),
  image: z.string().trim().max(1000).nullable().optional(),
  kycIdUrl: z.string().url().nullable().optional(),
  kycProofUrl: z.string().url().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export async function GET() {
  try {
    const session = await getVendorSession();
    const vendor = await prisma.vendor.findUnique({
      where: { id: session.vendorId },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
            specials: true,
            hours: true,
          },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({ ok: false, error: "Vendor not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, vendor });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Not signed in as a vendor.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { vendorId } = await requireVendor("MANAGER");
    const body = await req.json().catch(() => ({}));
    const normalizedBody = {
      ...body,
      cuisine: Array.isArray(body?.cuisine)
        ? body.cuisine.map((value: unknown) => String(value || "").trim()).filter(Boolean)
        : [],
      deliveryFee:
        body?.deliveryFee === undefined || body?.deliveryFee === null || body?.deliveryFee === ""
          ? 0
          : Number(body.deliveryFee),
      etaMins:
        body?.etaMins === undefined || body?.etaMins === null || body?.etaMins === ""
          ? 30
          : Number(body.etaMins),
      halaal: Boolean(body?.halaal),
      image: body?.image ? String(body.image).trim() : null,
      kycIdUrl: body?.kycIdUrl ? String(body.kycIdUrl).trim() : null,
      kycProofUrl: body?.kycProofUrl ? String(body.kycProofUrl).trim() : null,
      latitude:
        body?.latitude === undefined || body?.latitude === null || body?.latitude === ""
          ? null
          : Number(body.latitude),
      longitude:
        body?.longitude === undefined || body?.longitude === null || body?.longitude === ""
          ? null
          : Number(body.longitude),
    };

    const parsed = VendorProfileSchema.safeParse(normalizedBody);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid profile payload.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        address: parsed.data.address,
        suburb: parsed.data.suburb,
        city: parsed.data.city,
        province: parsed.data.province,
        cuisine: JSON.stringify(parsed.data.cuisine),
        deliveryFee: parsed.data.deliveryFee,
        etaMins: parsed.data.etaMins,
        halaal: parsed.data.halaal,
        image: parsed.data.image || null,
        kycIdUrl: parsed.data.kycIdUrl || null,
        kycProofUrl: parsed.data.kycProofUrl || null,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
      },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
            specials: true,
            hours: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, vendor });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update vendor profile.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}
