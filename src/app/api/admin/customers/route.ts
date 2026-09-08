import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";
import { isEmailVerificationRequired } from "@/lib/email-verification";
import { withQueryTimeout } from "@/lib/query-timeout";

const CUSTOMER_ROLES = ["CUSTOMER", "USER"];
const PAID_STATUSES = ["PAID", "SUCCESS"];
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim() ?? "";
  const page = clampInt(url.searchParams.get("page"), 1, 1, 100000);
  const pageSize = clampInt(url.searchParams.get("pageSize"), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);

  const where = {
    role: { in: CUSTOMER_ROLES },
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    withQueryTimeout(prisma.user.count({ where }), 0),
    withQueryTimeout(
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          emailVerifiedAt: true,
          lockedUntil: true,
          _count: { select: { orders: true } },
        },
      }),
      [],
    ),
  ]);

  const userIds = rows.map((row) => row.id);
  const spendByUser =
    userIds.length > 0
      ? await withQueryTimeout(
          prisma.order.groupBy({
            by: ["userId"],
            where: { userId: { in: userIds }, paymentStatus: { in: PAID_STATUSES } },
            _sum: { totalCents: true },
            _max: { createdAt: true },
          }),
          [],
        )
      : [];

  const spendMap = new Map(
    spendByUser.map((entry) => [
      entry.userId,
      { totalSpentCents: entry._sum.totalCents ?? 0, lastOrderAt: entry._max.createdAt ?? null },
    ]),
  );

  const now = Date.now();
  // Only call an account out as "Unverified" when the platform is actually
  // configured to require verification — otherwise every customer would show
  // a flag for a step the site never asked them to complete.
  const verificationRequired = isEmailVerificationRequired();
  const customers = rows.map((row) => {
    const spend = spendMap.get(row.id);
    const locked = row.lockedUntil ? new Date(row.lockedUntil).getTime() > now : false;
    const status = locked
      ? "LOCKED"
      : row.emailVerifiedAt
        ? "VERIFIED"
        : verificationRequired
          ? "UNVERIFIED"
          : "ACTIVE";
    return {
      id: row.id,
      name: row.name ?? null,
      email: row.email,
      phone: row.phone ?? null,
      joinedAt: row.createdAt.toISOString(),
      status,
      orderCount: row._count.orders,
      totalSpentCents: spend?.totalSpentCents ?? 0,
      lastOrderAt: spend?.lastOrderAt ? new Date(spend.lastOrderAt).toISOString() : null,
    };
  });

  return NextResponse.json({
    ok: true,
    customers,
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  });
}
