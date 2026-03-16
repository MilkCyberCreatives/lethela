import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";

const RoleSchema = z.object({
  role: z.enum(["MANAGER", "STAFF"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireVendor("OWNER");
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = RoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Choose a valid team role." }, { status: 400 });
    }

    const existing = await prisma.vendorMember.findUnique({
      where: { id },
      select: { id: true, vendorId: true, userId: true },
    });

    if (!existing || existing.vendorId !== session.vendorId) {
      return NextResponse.json({ ok: false, error: "Team member not found." }, { status: 404 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: session.vendorId },
      select: { ownerId: true },
    });

    if (existing.userId === vendor?.ownerId) {
      return NextResponse.json(
        { ok: false, error: "The store owner role cannot be changed here." },
        { status: 400 }
      );
    }

    const member = await prisma.vendorMember.update({
      where: { id },
      data: { role: parsed.data.role },
      select: { id: true, role: true },
    });

    return NextResponse.json({ ok: true, member });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update team member.";
    const status = /vendor|sign in|membership|approval|role|access/i.test(message) ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireVendor("OWNER");
    const { id } = await params;

    const existing = await prisma.vendorMember.findUnique({
      where: { id },
      select: { id: true, vendorId: true, userId: true },
    });

    if (!existing || existing.vendorId !== session.vendorId) {
      return NextResponse.json({ ok: false, error: "Team member not found." }, { status: 404 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: session.vendorId },
      select: { ownerId: true },
    });

    if (existing.userId === vendor?.ownerId) {
      return NextResponse.json(
        { ok: false, error: "The store owner cannot be removed." },
        { status: 400 }
      );
    }

    if (existing.userId === session.userId) {
      return NextResponse.json(
        { ok: false, error: "You cannot remove your own access." },
        { status: 400 }
      );
    }

    await prisma.vendorMember.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to remove team member.";
    const status = /vendor|sign in|membership|approval|role|access/i.test(message) ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
