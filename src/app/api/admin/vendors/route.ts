import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";

const STATUS_VALUES = new Set(["PENDING", "ACTIVE", "REJECTED", "ALL"]);

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const rawStatus = (req.nextUrl.searchParams.get("status") || "PENDING").toUpperCase();
  if (!STATUS_VALUES.has(rawStatus)) {
    return NextResponse.json({ ok: false, error: "Invalid status filter." }, { status: 400 });
  }

  const where =
    rawStatus === "ALL"
      ? {}
      : {
          status: rawStatus,
        };

  const [items, pendingCount] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        suburb: true,
        city: true,
        status: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 200,
    }),
    prisma.vendor.count({ where: { status: "PENDING" } }),
  ]);

  return NextResponse.json({ ok: true, authMode: guard.mode, pendingCount, items });
}
