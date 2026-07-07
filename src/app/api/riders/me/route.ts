import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createRiderConsoleToken } from "@/lib/rider-console";
import { prisma } from "@/server/db";

const ACTIVE_ORDER_STATUSES = ["PLACED", "PREPARING", "OUT_FOR_DELIVERY"];

function safeConsoleUrl(ref: string) {
  try {
    const token = createRiderConsoleToken(ref, 12);
    return `/rider/${encodeURIComponent(ref)}?token=${encodeURIComponent(token)}`;
  } catch {
    return null;
  }
}

function readRiderTip(itemsJson: string | null | undefined) {
  try {
    const parsed = JSON.parse(itemsJson || "{}");
    const value = parsed?.deliveryDetails?.riderTipCents;
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  if (session.user.role !== "RIDER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Rider access required." }, { status: 403 });
  }

  const [user, application] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, role: true, image: true, createdAt: true },
    }),
    prisma.riderApplication.findFirst({
      where: { email: session.user.email.toLowerCase() },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        licenseCode: true,
        suburb: true,
        city: true,
        vehicleType: true,
        vehicleRegistration: true,
        availableHours: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        hasSmartphone: true,
        hasBankAccount: true,
        experience: true,
        aiSummary: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  const approved = application?.status === "APPROVED" || session.user.role === "ADMIN";
  const activeOrders = approved
    ? await prisma.order.findMany({
        where: {
          status: { in: ACTIVE_ORDER_STATUSES },
          paymentStatus: { in: ["PAID", "SUCCESS"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 12,
        select: {
          publicId: true,
          ozowReference: true,
          status: true,
          totalCents: true,
          deliveryFeeCents: true,
          itemsJson: true,
          riderLocatedAt: true,
          createdAt: true,
          updatedAt: true,
          vendor: {
            select: {
              name: true,
              suburb: true,
              city: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      })
    : [];

  return NextResponse.json({
    ok: true,
    user,
    application,
    readiness: {
      approved,
      canReceiveDispatch:
        approved &&
        Boolean(process.env.RIDER_CONSOLE_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()),
      hasApplication: Boolean(application),
      documentsReady: Boolean(
        application?.hasSmartphone && application?.hasBankAccount && application?.licenseCode,
      ),
      area: application ? [application.suburb, application.city].filter(Boolean).join(", ") : null,
    },
    activeOrders: activeOrders.map((order) => {
      const ref = order.ozowReference || order.publicId;
      const riderTipCents = readRiderTip(order.itemsJson);
      return {
        ref,
        status: order.status,
        vendor: order.vendor?.name || "Unknown vendor",
        pickupArea:
          [order.vendor?.suburb, order.vendor?.city].filter(Boolean).join(", ") || "Area not set",
        totalCents: order.totalCents,
        deliveryFeeCents: order.deliveryFeeCents,
        riderTipCents,
        riderPayoutCents: order.deliveryFeeCents + riderTipCents,
        riderLocatedAt: order.riderLocatedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        consoleUrl: safeConsoleUrl(ref),
      };
    }),
  });
}
