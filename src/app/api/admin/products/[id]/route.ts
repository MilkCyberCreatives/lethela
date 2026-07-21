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
    path: ["reason"],
    message: "A reason is required.",
  });

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireAdminRequest(req, "products:approve");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  const parsed = ReviewSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid product review payload." },
      { status: 400 },
    );
  }
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      isAlcohol: true,
      vendor: {
        select: {
          status: true,
          isActive: true,
          liquorVerificationStatus: true,
          liquorLicenceExpiry: true,
        },
      },
    },
  });
  if (!product)
    return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
  if (
    parsed.data.status === "APPROVED" &&
    (!product.vendor.isActive || !["APPROVED", "ACTIVE"].includes(product.vendor.status))
  ) {
    return NextResponse.json(
      { ok: false, error: "Approve the vendor before approving this product." },
      { status: 409 },
    );
  }
  if (
    parsed.data.status === "APPROVED" &&
    product.isAlcohol &&
    (product.vendor.liquorVerificationStatus !== "APPROVED" ||
      !product.vendor.liquorLicenceExpiry ||
      product.vendor.liquorLicenceExpiry.getTime() <= Date.now())
  ) {
    return NextResponse.json(
      { ok: false, error: "Approve a current liquor licence before this liquor product." },
      { status: 409 },
    );
  }
  const updated = await prisma.product.update({
    where: { id },
    data: {
      status: parsed.data.status,
      reviewReason: parsed.data.status === "APPROVED" ? null : parsed.data.reason,
    },
    select: { id: true, status: true, reviewReason: true },
  });
  await logAdminAudit({
    actor: guard.actor,
    action: `product_${parsed.data.status.toLowerCase()}`,
    targetType: "product",
    targetId: id,
    before: { status: product.status },
    after: { status: updated.status, reason: updated.reviewReason },
  });
  return NextResponse.json({ ok: true, product: updated });
}
