import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";
import { logAdminAudit } from "@/lib/admin-audit";

const ReviewSchema = z
  .object({
    status: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
    reason: z.string().trim().min(5).max(500).optional(),
  })
  .refine((value) => value.status === "APPROVED" || Boolean(value.reason), {
    message: "A reason is required.",
    path: ["reason"],
  });

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireAdminRequest(req, "vendors:approve");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  const parsed = ReviewSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid liquor review payload." },
      { status: 400 },
    );
  }
  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    select: {
      id: true,
      liquorLicenceUrl: true,
      liquorLicenceNumber: true,
      liquorLicenceHolder: true,
      liquorLicencePremises: true,
      liquorLicenceProvince: true,
      liquorLicenceType: true,
      liquorLicenceExpiry: true,
      liquorVerificationStatus: true,
    },
  });
  if (!vendor) return NextResponse.json({ ok: false, error: "Vendor not found." }, { status: 404 });
  if (
    parsed.data.status === "APPROVED" &&
    (!vendor.liquorLicenceUrl ||
      !vendor.liquorLicenceNumber ||
      !vendor.liquorLicenceHolder ||
      !vendor.liquorLicencePremises ||
      !vendor.liquorLicenceProvince ||
      !vendor.liquorLicenceType ||
      !vendor.liquorLicenceExpiry ||
      vendor.liquorLicenceExpiry.getTime() <= Date.now())
  ) {
    return NextResponse.json(
      { ok: false, error: "A complete, current liquor licence is required before approval." },
      { status: 409 },
    );
  }
  const updated = await prisma.vendor.update({
    where: { id },
    data: {
      liquorVerificationStatus: parsed.data.status,
      liquorReviewReason: parsed.data.status === "APPROVED" ? null : parsed.data.reason,
    },
    select: { id: true, liquorVerificationStatus: true, liquorReviewReason: true },
  });
  await logAdminAudit({
    actor: guard.actor,
    action: `liquor_${parsed.data.status.toLowerCase()}`,
    targetType: "vendor",
    targetId: id,
    before: { status: vendor.liquorVerificationStatus },
    after: { status: updated.liquorVerificationStatus, reason: updated.liquorReviewReason },
  });
  return NextResponse.json({ ok: true, vendor: updated });
}
