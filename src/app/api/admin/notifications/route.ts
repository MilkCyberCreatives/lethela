import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";
import { getApplicantNotificationChannelStatus } from "@/lib/application-notifications";
import { getAdminNotificationChannelStatus } from "@/lib/admin-notifications";
import { countRiderApplications } from "@/lib/rider-applications";

function isLocalSqliteRuntime() {
  return (
    process.env.NODE_ENV !== "production" &&
    (process.env.DATABASE_PROVIDER?.trim().toLowerCase() === "sqlite" ||
      process.env.DATABASE_URL?.trim().toLowerCase().startsWith("file:"))
  );
}

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  if (isLocalSqliteRuntime()) {
    return NextResponse.json({
      ok: true,
      pendingCount: 0,
      riderPendingCount: 0,
      riderUnderReviewCount: 0,
      totalPendingApprovals: 0,
      latestPending: [],
      recentCampaigns: [],
      channels: getAdminNotificationChannelStatus(),
      applicantChannels: getApplicantNotificationChannelStatus(),
    });
  }

  const [pendingCount, latestPending, riderPendingCount, riderUnderReviewCount, recentCampaigns] =
    await Promise.all([
      prisma.vendor.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
      prisma.vendor.findMany({
        where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
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
      countRiderApplications("SUBMITTED"),
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
    applicantChannels: getApplicantNotificationChannelStatus(),
  });
}
