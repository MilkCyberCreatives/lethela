import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRequest } from "@/lib/admin-auth";
import { notifyApplicant } from "@/lib/application-notifications";
import {
  type RiderApplicationStatus,
  updateRiderApplicationStatus,
} from "@/lib/rider-applications";
import { logAdminAudit } from "@/lib/admin-audit";
import { prisma } from "@/lib/db";
import { getRiderReadiness } from "@/lib/rider-readiness";

const StatusSchema = z.object({
  status: z.enum([
    "SUBMITTED",
    "UNDER_REVIEW",
    "CHANGES_REQUESTED",
    "APPROVED",
    "REJECTED",
    "SUSPENDED",
  ]),
  reason: z.string().trim().max(500).optional(),
});

function isLocalSqliteRuntime() {
  return (
    !process.env.VERCEL &&
    (process.env.DATABASE_PROVIDER?.trim().toLowerCase() === "sqlite" ||
      process.env.DATABASE_URL?.trim().toLowerCase().startsWith("file:"))
  );
}

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireAdminRequest(req, "riders:approve");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid rider status payload." },
      { status: 400 },
    );
  }
  if (
    ["CHANGES_REQUESTED", "REJECTED", "SUSPENDED"].includes(parsed.data.status) &&
    !parsed.data.reason
  ) {
    return NextResponse.json(
      { ok: false, error: "A reason is required for this status." },
      { status: 400 },
    );
  }

  const reviewCandidate = await prisma.riderApplication.findUnique({
    where: { id: String(id || "").trim() },
    include: { user: { select: { passwordHash: true } } },
  });
  if (!reviewCandidate) {
    return NextResponse.json({ ok: false, error: "Rider application not found." }, { status: 404 });
  }
  if (parsed.data.status === "APPROVED") {
    const readiness = getRiderReadiness(reviewCandidate);
    if (!readiness.canSubmit) {
      return NextResponse.json(
        { ok: false, error: "This rider profile is incomplete and cannot be approved.", readiness },
        { status: 409 },
      );
    }
    if (!reviewCandidate.user?.passwordHash) {
      return NextResponse.json(
        { ok: false, error: "Link a securely registered rider account before approval." },
        { status: 409 },
      );
    }
  }

  const item = await updateRiderApplicationStatus(
    String(id || "").trim(),
    parsed.data.status as RiderApplicationStatus,
  );
  if (!item) {
    return NextResponse.json({ ok: false, error: "Rider application not found." }, { status: 404 });
  }
  await prisma.riderApplication.update({
    where: { id: item.id },
    data: {
      reviewReason: parsed.data.reason || null,
      availableNow: ["APPROVED", "AVAILABLE"].includes(parsed.data.status) ? undefined : false,
    },
  });

  await logAdminAudit({
    actor: guard.actor,
    action: `set_rider_${parsed.data.status.toLowerCase()}`,
    targetType: "rider_application",
    targetId: item.id,
    after: { status: item.status },
  });

  const notificationStatus =
    item.status === "APPROVED"
      ? "approved"
      : item.status === "REJECTED"
        ? "rejected"
        : item.status === "UNDER_REVIEW"
          ? "under_review"
          : null;

  if (notificationStatus && !isLocalSqliteRuntime()) {
    await notifyApplicant({
      kind: "rider",
      name: item.fullName,
      email: item.email,
      phone: item.phone,
      status: notificationStatus,
      reference: item.id,
    });
  }

  return NextResponse.json({ ok: true, item });
}
