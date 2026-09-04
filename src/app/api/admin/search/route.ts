import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

const TAKE = 5;

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const query = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (query.length < 2) {
    return NextResponse.json({ ok: true, groups: {} });
  }

  const [orders, vendors, products, riders, customers] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { publicId: { contains: query } },
          { ozowReference: { contains: query } },
          { user: { name: { contains: query } } },
          { user: { email: { contains: query } } },
          { user: { phone: { contains: query } } },
          { vendor: { name: { contains: query } } },
          { assignedRider: { fullName: { contains: query } } },
          { assignedRider: { phone: { contains: query } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: TAKE,
      select: {
        id: true,
        publicId: true,
        ozowReference: true,
        status: true,
        vendor: { select: { name: true } },
      },
    }),
    prisma.vendor.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
          { suburb: { contains: query } },
          { city: { contains: query } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: TAKE,
      select: { id: true, name: true, status: true, suburb: true, city: true },
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { slug: { contains: query } },
          { vendor: { name: { contains: query } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: TAKE,
      select: { id: true, name: true, status: true, vendor: { select: { name: true } } },
    }),
    prisma.riderApplication.findMany({
      where: {
        OR: [
          { fullName: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
          { vehicleRegistration: { contains: query } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: TAKE,
      select: { id: true, fullName: true, status: true, phone: true },
    }),
    prisma.user.findMany({
      where: {
        role: { in: ["CUSTOMER", "USER"] },
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: TAKE,
      select: { id: true, name: true, email: true, phone: true },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    groups: {
      orders: orders.map((item) => ({
        id: item.id,
        title: item.ozowReference || item.publicId,
        subtitle: `${item.vendor.name} · ${item.status.replaceAll("_", " ")}`,
        view: "orders",
        orderRef: item.ozowReference || item.publicId,
      })),
      vendors: vendors.map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: `${[item.suburb, item.city].filter(Boolean).join(", ") || "Location pending"} · ${item.status.replaceAll("_", " ")}`,
        view: "vendors",
        query: item.name,
      })),
      products: products.map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: `${item.vendor.name} · ${item.status.replaceAll("_", " ")}`,
        view: "products",
        query: item.name,
      })),
      riders: riders.map((item) => ({
        id: item.id,
        title: item.fullName,
        subtitle: `${item.phone} · ${item.status.replaceAll("_", " ")}`,
        view: "riders",
        query: item.fullName,
      })),
      customers: customers.map((item) => ({
        id: item.id,
        title: item.name || item.email,
        subtitle: item.name ? item.email : item.phone || "Customer",
        view: "users",
        query: item.email,
      })),
    },
  });
}
