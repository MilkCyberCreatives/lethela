import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";
import { getAdminNotificationChannelStatus } from "@/lib/admin-notifications";
import { countRiderApplications } from "@/lib/rider-applications";

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const [pendingCount, latestPending, riderPendingCount, riderUnderReviewCount, recentCampaigns] = await Promise.all([
    prisma.vendor.count({ where: { status: "PENDING" } }),
    prisma.vendor.findMany({
      where: { status: "PENDING" },
      orderBy: [{ updatedAt: "desc" }],
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        suburb: true,
        city: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    countRiderApplications("PENDING"),
    countRiderApplications("UNDER_REVIEW"),
    prisma.pushCampaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        segment: true,
        sentCount: true,
        failedCount: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    pendingCount,
    riderPendingCount,
    riderUnderReviewCount,
    totalPendingApprovals: pendingCount + riderPendingCount + riderUnderReviewCount,
    latestPending,
    recentCampaigns,
    channels: getAdminNotificationChannelStatus(),
  });
}
