import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import {
  countRiderApplications,
  listRiderApplications,
  type RiderApplicationStatus,
} from "@/lib/rider-applications";

const VALID_STATUS = new Set<RiderApplicationStatus | "ALL">([
  "ALL",
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
]);

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const rawStatus = (req.nextUrl.searchParams.get("status") || "PENDING").toUpperCase() as
    | RiderApplicationStatus
    | "ALL";
  if (!VALID_STATUS.has(rawStatus)) {
    return NextResponse.json({ ok: false, error: "Invalid status filter." }, { status: 400 });
  }

  const take = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("take") || 100)));
  const [items, pendingCount, underReviewCount, approvedCount, rejectedCount, totalCount] = await Promise.all([
    listRiderApplications(rawStatus, take),
    countRiderApplications("PENDING"),
    countRiderApplications("UNDER_REVIEW"),
    countRiderApplications("APPROVED"),
    countRiderApplications("REJECTED"),
    countRiderApplications(),
  ]);

  return NextResponse.json({
    ok: true,
    authMode: guard.mode,
    counts: {
      pending: pendingCount,
      underReview: underReviewCount,
      approved: approvedCount,
      rejected: rejectedCount,
      total: totalCount,
    },
    items,
  });
}
