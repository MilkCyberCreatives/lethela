import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";
import { getVendorReadiness } from "@/lib/vendor-readiness";

const STATUS_VALUES = new Set([
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "DRAFT_PROFILE",
  "SUBMITTED_FOR_APPROVAL",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "PENDING",
  "ACTIVE",
  "ALL",
]);

function normalizeStatusFilter(value: string) {
  if (value === "PENDING" || value === "SUBMITTED_FOR_APPROVAL") return "SUBMITTED";
  if (value === "DRAFT_PROFILE") return "DRAFT";
  if (value === "ACTIVE") return "APPROVED";
  return value;
}

// Older records use other names for the same stage, so each tab matches all of them.
const STATUS_GROUPS: Record<string, string[]> = {
  DRAFT: ["DRAFT", "DRAFT_PROFILE"],
  SUBMITTED: ["SUBMITTED", "SUBMITTED_FOR_APPROVAL", "UNDER_REVIEW"],
  APPROVED: ["APPROVED", "ACTIVE"],
};

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const rawStatus = (req.nextUrl.searchParams.get("status") || "SUBMITTED").toUpperCase();
  if (!STATUS_VALUES.has(rawStatus)) {
    return NextResponse.json({ ok: false, error: "Invalid status filter." }, { status: 400 });
  }
  const statusFilter = normalizeStatusFilter(rawStatus);

  const where =
    statusFilter === "ALL"
      ? {}
      : {
          status: { in: STATUS_GROUPS[statusFilter] ?? [statusFilter] },
        };

  const [
    rows,
    draftCount,
    submittedCount,
    changesRequestedCount,
    approvedCount,
    activeCount,
    rejectedCount,
    suspendedCount,
    totalCount,
  ] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      select: {
        township: true,
        storeType: true,
        etaMins: true,
        bankName: true,
        bankAccountName: true,
        bankAccountNumber: true,
        owner: {
          select: { passwordHash: true, accounts: { select: { provider: true }, take: 1 } },
        },
        _count: {
          select: { products: true, items: true, hours: { where: { closed: false } } },
        },
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        suburb: true,
        city: true,
        province: true,
        status: true,
        isActive: true,
        ownerId: true,
        kycIdUrl: true,
        kycProofUrl: true,
        cuisine: true,
        deliveryFee: true,
        halaal: true,
        image: true,
        liquorLicenceUrl: true,
        liquorLicenceNumber: true,
        liquorLicenceExpiry: true,
        liquorVerificationStatus: true,
        liquorReviewReason: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 200,
    }),
    prisma.vendor.count({ where: { status: { in: STATUS_GROUPS.DRAFT } } }),
    prisma.vendor.count({ where: { status: { in: STATUS_GROUPS.SUBMITTED } } }),
    prisma.vendor.count({ where: { status: "CHANGES_REQUESTED" } }),
    prisma.vendor.count({ where: { status: { in: STATUS_GROUPS.APPROVED } } }),
    prisma.vendor.count({
      where: { status: { in: ["APPROVED", "ACTIVE"] }, isActive: true },
    }),
    prisma.vendor.count({ where: { status: "REJECTED" } }),
    prisma.vendor.count({ where: { status: "SUSPENDED" } }),
    prisma.vendor.count(),
  ]);
  const pendingCount = submittedCount + changesRequestedCount;

  const pendingProducts = rows.length
    ? await prisma.product.groupBy({
        by: ["vendorId"],
        where: { vendorId: { in: rows.map((row) => row.id) }, status: "SUBMITTED" },
        _count: { _all: true },
      })
    : [];
  const pendingProductsByVendor = new Map(
    pendingProducts.map((row) => [row.vendorId, row._count._all]),
  );

  // Readiness is worked out here so the list never sends banking details or password data.
  const items = rows.map(
    ({ bankName, bankAccountName, bankAccountNumber, owner, _count, ...vendor }) => {
      const readiness = getVendorReadiness({
        ...vendor,
        bankName,
        bankAccountName,
        bankAccountNumber,
        productCount: _count.products,
        menuItemCount: _count.items,
        operatingHoursCount: _count.hours,
      });
      return {
        ...vendor,
        hasBankAccount: Boolean(bankAccountNumber),
        productCount: _count.products,
        menuItemCount: _count.items,
        pendingProductCount: pendingProductsByVendor.get(vendor.id) ?? 0,
        openDays: _count.hours,
        ownerCanSignIn: Boolean(owner?.passwordHash) || Boolean(owner?.accounts.length),
        readiness: {
          canApprove: readiness.canSubmit,
          missing: readiness.checks
            .filter((check) => check.required && !check.complete)
            .map((check) => check.label),
          later: readiness.checks
            .filter((check) => !check.required && !check.complete)
            .map((check) => check.label),
        },
      };
    },
  );

  return NextResponse.json({
    ok: true,
    authMode: guard.mode,
    pendingCount,
    counts: {
      draft: draftCount,
      submitted: submittedCount,
      changesRequested: changesRequestedCount,
      pending: pendingCount,
      approved: approvedCount,
      active: activeCount,
      rejected: rejectedCount,
      suspended: suspendedCount,
      total: totalCount,
    },
    items,
  });
}
