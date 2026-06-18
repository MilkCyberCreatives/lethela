import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRequest } from "@/lib/admin-auth";
import { notifyApplicant } from "@/lib/application-notifications";
import {
  type RiderApplicationStatus,
  updateRiderApplicationStatus,
} from "@/lib/rider-applications";
import { logAdminAudit } from "@/lib/admin-audit";

const StatusSchema = z.object({
  status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]),
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
  const guard = await requireAdminRequest(req);
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

  const item = await updateRiderApplicationStatus(
    String(id || "").trim(),
    parsed.data.status as RiderApplicationStatus,
  );
  if (!item) {
    return NextResponse.json({ ok: false, error: "Rider application not found." }, { status: 404 });
  }

  await logAdminAudit({
    actor: guard.mode,
    action: `set_rider_${parsed.data.status.toLowerCase()}`,
    targetType: "rider_application",
    targetId: item.id,
    after: { status: item.status, email: item.email, phone: item.phone },
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
