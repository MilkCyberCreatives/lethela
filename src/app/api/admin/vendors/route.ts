import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";

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
          status: statusFilter,
        };

  const [
    items,
    draftCount,
    submittedCount,
    changesRequestedCount,
    approvedCount,
    rejectedCount,
    suspendedCount,
    totalCount,
  ] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
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
    prisma.vendor.count({ where: { status: { in: ["DRAFT", "DRAFT_PROFILE"] } } }),
    prisma.vendor.count({
      where: { status: { in: ["SUBMITTED", "SUBMITTED_FOR_APPROVAL", "UNDER_REVIEW"] } },
    }),
    prisma.vendor.count({ where: { status: "CHANGES_REQUESTED" } }),
    prisma.vendor.count({ where: { status: "APPROVED" } }),
    prisma.vendor.count({ where: { status: "REJECTED" } }),
    prisma.vendor.count({ where: { status: "SUSPENDED" } }),
    prisma.vendor.count(),
  ]);
  const pendingCount = submittedCount + changesRequestedCount;

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
      active: approvedCount,
      rejected: rejectedCount,
      suspended: suspendedCount,
      total: totalCount,
    },
    items,
  });
}
