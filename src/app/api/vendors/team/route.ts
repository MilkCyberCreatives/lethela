import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";

const TeamMemberSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  role: z.enum(["MANAGER", "STAFF"]),
  name: z.string().trim().max(120).optional(),
});

export async function GET() {
  try {
    const { vendorId } = await requireVendor("MANAGER");
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        ownerId: true,
        members: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            createdAt: true,
            userId: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({ ok: false, error: "Vendor not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      members: vendor.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        email: member.user.email,
        name: member.user.name,
        role: member.role,
        joinedAt: member.createdAt.toISOString(),
        isOwner: member.userId === vendor.ownerId,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load team members.";
    const status = /vendor|sign in|membership|approval|role|access/i.test(message) ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const { vendorId } = await requireVendor("OWNER");
    const body = await req.json().catch(() => ({}));
    const parsed = TeamMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid staff email and role." },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { ownerId: true },
    });

    if (!vendor) {
      return NextResponse.json({ ok: false, error: "Vendor not found." }, { status: 404 });
    }

    const user = await prisma.user.upsert({
      where: { email: parsed.data.email },
      update: parsed.data.name ? { name: parsed.data.name } : {},
      create: {
        email: parsed.data.email,
        name: parsed.data.name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (user.id === vendor.ownerId) {
      return NextResponse.json(
        { ok: false, error: "The store owner already has full access." },
        { status: 400 }
      );
    }

    const member = await prisma.vendorMember.upsert({
      where: {
        vendorId_userId: {
          vendorId,
          userId: user.id,
        },
      },
      update: {
        role: parsed.data.role,
      },
      create: {
        vendorId,
        userId: user.id,
        role: parsed.data.role,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        userId: true,
      },
    });

    return NextResponse.json({
      ok: true,
      member: {
        id: member.id,
        userId: member.userId,
        email: user.email,
        name: user.name,
        role: member.role,
        joinedAt: member.createdAt.toISOString(),
        isOwner: false,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add team member.";
    const status = /vendor|sign in|membership|approval|role|access/i.test(message) ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
