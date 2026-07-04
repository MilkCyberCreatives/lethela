import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";

const STATUS_VALUES = new Set([
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
  if (value === "PENDING") return "SUBMITTED_FOR_APPROVAL";
  if (value === "ACTIVE") return "APPROVED";
  return value;
}

function isLocalSqliteRuntime() {
  return (
    !process.env.VERCEL &&
    (process.env.DATABASE_PROVIDER?.trim().toLowerCase() === "sqlite" ||
      process.env.DATABASE_URL?.trim().toLowerCase().startsWith("file:"))
  );
}

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const rawStatus = (
    req.nextUrl.searchParams.get("status") || "SUBMITTED_FOR_APPROVAL"
  ).toUpperCase();
  if (!STATUS_VALUES.has(rawStatus)) {
    return NextResponse.json({ ok: false, error: "Invalid status filter." }, { status: 400 });
  }
  const statusFilter = normalizeStatusFilter(rawStatus);

  if (isLocalSqliteRuntime()) {
    return NextResponse.json({
      ok: true,
      authMode: guard.mode,
      pendingCount: 0,
      counts: {
        draft: 0,
        submitted: 0,
        changesRequested: 0,
        approved: 0,
        rejected: 0,
        suspended: 0,
        total: 0,
      },
      items: [],
    });
  }

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
        createdAt: true,
        updatedAt: true,
      },
      take: 200,
    }),
    prisma.vendor.count({ where: { status: "DRAFT_PROFILE" } }),
    prisma.vendor.count({ where: { status: "SUBMITTED_FOR_APPROVAL" } }),
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
