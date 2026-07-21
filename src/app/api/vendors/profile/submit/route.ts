import { NextResponse } from "next/server";
import { getVendorSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { notifyAdminsOfVendorApplication } from "@/lib/admin-notifications";
import { notifyApplicant } from "@/lib/application-notifications";
import { getVendorReadiness, VENDOR_STATUS } from "@/lib/vendor-readiness";

export async function POST() {
  let session: Awaited<ReturnType<typeof getVendorSession>>;
  try {
    session = await getVendorSession();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Please sign in as a vendor.",
      },
      { status: 401 },
    );
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: session.vendorId },
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      address: true,
      suburb: true,
      city: true,
      province: true,
      municipality: true,
      township: true,
      sectionArea: true,
      storeType: true,
      cuisine: true,
      deliveryFee: true,
      etaMins: true,
      kycIdUrl: true,
      kycProofUrl: true,
      bankName: true,
      bankAccountName: true,
      bankAccountNumber: true,
      bankBranchCode: true,
      _count: { select: { products: true, items: true, hours: true } },
    },
  });

  if (!vendor) {
    return NextResponse.json({ ok: false, error: "Vendor profile not found." }, { status: 404 });
  }

  const readiness = getVendorReadiness({
    ...vendor,
    productCount: vendor._count.products,
    menuItemCount: vendor._count.items,
    operatingHoursCount: vendor._count.hours,
  });

  if (!readiness.canSubmit) {
    return NextResponse.json(
      {
        ok: false,
        error: "Complete every required profile section before submitting for approval.",
        readiness,
      },
      { status: 422 },
    );
  }

  const updated = await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      status: VENDOR_STATUS.SUBMITTED,
      isActive: false,
      submittedAt: new Date(),
      reviewReason: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      suburb: true,
      city: true,
    },
  });

  await Promise.all([
    notifyAdminsOfVendorApplication({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      email: updated.email || session.email,
      phone: updated.phone || "",
      suburb: updated.suburb || "",
      city: updated.city || "",
    }),
    notifyApplicant({
      kind: "vendor",
      name: updated.name,
      email: updated.email || session.email,
      phone: updated.phone || "",
      status: "submitted",
      reference: updated.slug,
    }),
  ]);

  return NextResponse.redirect(
    new URL(
      "/vendors/dashboard?submitted=1",
      process.env.NEXTAUTH_URL || "https://www.lethela.co.za",
    ),
  );
}
