import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";

const ActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

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
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid action payload." }, { status: 400 });
  }

  const existing = await prisma.vendor.findUnique({
    where: { id },
    select: { id: true, email: true, status: true, ownerId: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Vendor not found." }, { status: 404 });
  }

  const approved = parsed.data.action === "approve";

  const vendor = await prisma.$transaction(async (tx) => {
    const updated = await tx.vendor.update({
      where: { id: existing.id },
      data: {
        status: approved ? "ACTIVE" : "REJECTED",
        isActive: approved,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        status: true,
        isActive: true,
        updatedAt: true,
      },
    });

    if (approved && updated.email) {
      const normalizedEmail = updated.email.toLowerCase();
      const ownerUser = existing.ownerId
        ? await tx.user.findUnique({
            where: { id: existing.ownerId },
            select: { id: true, email: true, role: true },
          })
        : null;
      const existingUser =
        ownerUser ||
        (await tx.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true, email: true, role: true },
        }));

      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              email: normalizedEmail,
              role: existingUser.role === "ADMIN" ? "ADMIN" : "VENDOR",
            },
            select: { id: true },
          })
        : await tx.user.create({
            data: {
              email: normalizedEmail,
              role: "VENDOR",
            },
            select: { id: true },
          });

      await tx.vendor.update({
        where: { id: updated.id },
        data: { ownerId: user.id },
      });

      await tx.vendorMember.upsert({
        where: {
          vendorId_userId: {
            vendorId: updated.id,
            userId: user.id,
          },
        },
        update: { role: "OWNER" },
        create: {
          vendorId: updated.id,
          userId: user.id,
          role: "OWNER",
        },
      });
    }

    return updated;
  });

  return NextResponse.json({
    ok: true,
    vendor,
    message: approved ? "Vendor approved." : "Vendor rejected.",
  });
}
