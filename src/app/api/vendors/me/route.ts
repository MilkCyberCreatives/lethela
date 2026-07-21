import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getVendorSession } from "@/lib/authz";
import { STORE_TYPES } from "@/lib/vendor-readiness";

const ProtectedFileSchema = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => value.startsWith("/api/files?path=private%2F"), {
    message: "Upload documents through the protected file control.",
  });

const VendorProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1200).nullable().optional(),
  coverImage: z.string().trim().max(1000).nullable().optional(),
  phone: z.string().trim().min(8).max(40),
  address: z.string().trim().min(6).max(240),
  suburb: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  province: z.string().trim().min(2).max(120),
  municipality: z.string().trim().max(120).nullable().optional(),
  township: z.string().trim().max(120).nullable().optional(),
  sectionArea: z.string().trim().max(120).nullable().optional(),
  pickupInstructions: z.string().trim().max(500).nullable().optional(),
  storeType: z.enum(STORE_TYPES),
  cuisine: z.array(z.string().trim().min(2).max(40)).min(1).max(8),
  etaMins: z.number().int().min(10).max(120),
  preparationMinutes: z.number().int().min(5).max(180),
  orderCapacity: z.number().int().min(1).max(500),
  halaal: z.boolean(),
  image: z.string().trim().max(1000).nullable().optional(),
  kycIdUrl: ProtectedFileSchema.nullable().optional(),
  kycProofUrl: ProtectedFileSchema.nullable().optional(),
  bankName: z.string().trim().min(2).max(120),
  bankAccountName: z.string().trim().min(2).max(160),
  bankAccountNumber: z.string().trim().max(40),
  bankBranchCode: z.string().trim().max(20).nullable().optional(),
  bankAccountType: z.string().trim().max(40).nullable().optional(),
  liquorLicenceUrl: ProtectedFileSchema.nullable().optional(),
  liquorLicenceNumber: z.string().trim().max(120).nullable().optional(),
  liquorLicenceHolder: z.string().trim().max(160).nullable().optional(),
  liquorLicencePremises: z.string().trim().max(240).nullable().optional(),
  liquorLicenceProvince: z.string().trim().max(120).nullable().optional(),
  liquorLicenceType: z.string().trim().max(120).nullable().optional(),
  liquorLicenceExpiry: z.string().datetime().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  temporaryClosed: z.boolean().optional().default(false),
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

    return NextResponse.json({
      ok: true,
      vendor: {
        ...vendor,
        bankAccountNumber: "",
        bankAccountLast4: vendor.bankAccountNumber?.slice(-4) || null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Not signed in as a vendor.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { vendorId, role } = await getVendorSession();
    if (role === "STAFF") {
      return NextResponse.json(
        { ok: false, error: "Only the vendor owner or manager can update this profile." },
        { status: 403 },
      );
    }
    const body = await req.json().catch(() => ({}));
    const normalizedBody = {
      ...body,
      municipality: body?.municipality ? String(body.municipality).trim() : null,
      township: body?.township ? String(body.township).trim() : null,
      sectionArea: body?.sectionArea ? String(body.sectionArea).trim() : null,
      storeType: String(body?.storeType || "").trim(),
      description: body?.description ? String(body.description).trim() : null,
      coverImage: body?.coverImage ? String(body.coverImage).trim() : null,
      pickupInstructions: body?.pickupInstructions ? String(body.pickupInstructions).trim() : null,
      cuisine: Array.isArray(body?.cuisine)
        ? body.cuisine.map((value: unknown) => String(value || "").trim()).filter(Boolean)
        : [],
      etaMins:
        body?.etaMins === undefined || body?.etaMins === null || body?.etaMins === ""
          ? 30
          : Number(body.etaMins),
      preparationMinutes: Number(body?.preparationMinutes || body?.etaMins || 30),
      orderCapacity: Number(body?.orderCapacity || 20),
      halaal: Boolean(body?.halaal),
      image: body?.image ? String(body.image).trim() : null,
      kycIdUrl: body?.kycIdUrl ? String(body.kycIdUrl).trim() : null,
      kycProofUrl: body?.kycProofUrl ? String(body.kycProofUrl).trim() : null,
      bankName: body?.bankName ? String(body.bankName).trim() : "",
      bankAccountName: body?.bankAccountName ? String(body.bankAccountName).trim() : "",
      bankAccountNumber: body?.bankAccountNumber
        ? String(body.bankAccountNumber).trim().replace(/\s+/g, "")
        : "",
      bankBranchCode: body?.bankBranchCode ? String(body.bankBranchCode).trim() : null,
      bankAccountType: body?.bankAccountType ? String(body.bankAccountType).trim() : null,
      liquorLicenceUrl: body?.liquorLicenceUrl ? String(body.liquorLicenceUrl).trim() : null,
      liquorLicenceNumber: body?.liquorLicenceNumber
        ? String(body.liquorLicenceNumber).trim()
        : null,
      liquorLicenceHolder: body?.liquorLicenceHolder
        ? String(body.liquorLicenceHolder).trim()
        : null,
      liquorLicencePremises: body?.liquorLicencePremises
        ? String(body.liquorLicencePremises).trim()
        : null,
      liquorLicenceProvince: body?.liquorLicenceProvince
        ? String(body.liquorLicenceProvince).trim()
        : null,
      liquorLicenceType: body?.liquorLicenceType ? String(body.liquorLicenceType).trim() : null,
      liquorLicenceExpiry: body?.liquorLicenceExpiry
        ? String(body.liquorLicenceExpiry).trim()
        : null,
      temporaryClosed: Boolean(body?.temporaryClosed),
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
        {
          ok: false,
          error: "Invalid profile payload.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const currentVendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        status: true,
        address: true,
        city: true,
        province: true,
        township: true,
        latitude: true,
        longitude: true,
        kycIdUrl: true,
        kycProofUrl: true,
        bankName: true,
        bankAccountName: true,
        bankAccountNumber: true,
        bankBranchCode: true,
        liquorLicenceUrl: true,
        liquorLicenceNumber: true,
        liquorLicenceExpiry: true,
      },
    });
    if (!currentVendor) {
      return NextResponse.json({ ok: false, error: "Vendor not found." }, { status: 404 });
    }
    const bankingChanged =
      currentVendor.bankName !== parsed.data.bankName ||
      currentVendor.bankAccountName !== parsed.data.bankAccountName ||
      Boolean(parsed.data.bankAccountNumber) ||
      currentVendor.bankBranchCode !== (parsed.data.bankBranchCode || null);
    const liquorChanged =
      currentVendor.liquorLicenceUrl !== (parsed.data.liquorLicenceUrl || null) ||
      currentVendor.liquorLicenceNumber !== (parsed.data.liquorLicenceNumber || null) ||
      (currentVendor.liquorLicenceExpiry?.toISOString() || null) !==
        (parsed.data.liquorLicenceExpiry || null);
    const approvalSensitiveChanged =
      currentVendor.address !== parsed.data.address ||
      currentVendor.city !== parsed.data.city ||
      currentVendor.province !== parsed.data.province ||
      currentVendor.township !== (parsed.data.township || parsed.data.suburb) ||
      currentVendor.latitude !== (parsed.data.latitude ?? null) ||
      currentVendor.longitude !== (parsed.data.longitude ?? null) ||
      currentVendor.kycIdUrl !== (parsed.data.kycIdUrl || null) ||
      currentVendor.kycProofUrl !== (parsed.data.kycProofUrl || null);

    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        coverImage: parsed.data.coverImage || null,
        phone: parsed.data.phone,
        address: parsed.data.address,
        suburb: parsed.data.suburb,
        city: parsed.data.city,
        province: parsed.data.province,
        municipality: parsed.data.municipality || null,
        township: parsed.data.township || parsed.data.suburb,
        sectionArea: parsed.data.sectionArea || null,
        pickupInstructions: parsed.data.pickupInstructions || null,
        storeType: parsed.data.storeType,
        cuisine: JSON.stringify(parsed.data.cuisine),
        etaMins: parsed.data.etaMins,
        preparationMinutes: parsed.data.preparationMinutes,
        orderCapacity: parsed.data.orderCapacity,
        halaal: parsed.data.halaal,
        image: parsed.data.image || null,
        kycIdUrl: parsed.data.kycIdUrl || null,
        kycProofUrl: parsed.data.kycProofUrl || null,
        bankName: parsed.data.bankName,
        bankAccountName: parsed.data.bankAccountName,
        bankAccountNumber: parsed.data.bankAccountNumber || undefined,
        bankBranchCode: parsed.data.bankBranchCode || null,
        bankAccountType: parsed.data.bankAccountType || null,
        liquorLicenceUrl: parsed.data.liquorLicenceUrl || null,
        liquorLicenceNumber: parsed.data.liquorLicenceNumber || null,
        liquorLicenceHolder: parsed.data.liquorLicenceHolder || null,
        liquorLicencePremises: parsed.data.liquorLicencePremises || null,
        liquorLicenceProvince: parsed.data.liquorLicenceProvince || null,
        liquorLicenceType: parsed.data.liquorLicenceType || null,
        liquorLicenceExpiry: parsed.data.liquorLicenceExpiry
          ? new Date(parsed.data.liquorLicenceExpiry)
          : null,
        temporaryClosed: parsed.data.temporaryClosed,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        ...(currentVendor.status === "APPROVED" && approvalSensitiveChanged
          ? {
              status: "DRAFT",
              isActive: false,
              reviewReason: "Store identity or location changes require approval before relisting.",
            }
          : {}),
        ...(bankingChanged ? { bankVerificationStatus: "UNVERIFIED" } : {}),
        ...(liquorChanged
          ? {
              liquorVerificationStatus: parsed.data.liquorLicenceUrl ? "PENDING" : "NOT_APPLICABLE",
              liquorReviewReason: null,
            }
          : {}),
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

    return NextResponse.json({
      ok: true,
      vendor: {
        ...vendor,
        bankAccountNumber: "",
        bankAccountLast4: vendor.bankAccountNumber?.slice(-4) || null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update vendor profile.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}
