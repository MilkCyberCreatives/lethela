import fs from "node:fs";
import path from "node:path";
import { prismaRuntimeInfo } from "@/lib/db";

function sqliteFilePath() {
  if (prismaRuntimeInfo.provider !== "sqlite") return null;
  if (!prismaRuntimeInfo.url.startsWith("file:")) return null;
  return prismaRuntimeInfo.url.slice("file:".length);
}

function count(db: any, sql: string, ...params: unknown[]) {
  return Number(db.prepare(sql).get(...params)?.n || 0);
}

export async function getSqliteVendorDashboardData(vendorId: string, since: Date) {
  const filePath = sqliteFilePath();
  if (!filePath || !fs.existsSync(filePath)) return null;

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(path.resolve(filePath));
  try {
    const vendor = db
      .prepare(
        `SELECT id, name, slug, email, status, isActive, suburb, city, province,
                municipality, township, sectionArea, storeType, phone, address, cuisine,
                deliveryFee, etaMins, latitude, longitude, kycIdUrl, kycProofUrl,
                bankName, bankAccountName, bankAccountNumber, bankBranchCode, updatedAt
         FROM Vendor
         WHERE id = ?`,
      )
      .get(vendorId) as any;
    if (!vendor) return null;

    const orders = (
      (
        db.prepare(
          `SELECT id, createdAt, status, paymentStatus, totalCents
           FROM "Order"
           WHERE vendorId = ? AND createdAt >= ?
           ORDER BY createdAt DESC
           LIMIT 120`,
        ) as any
      ).all(vendorId, since.toISOString()) as any[]
    ).map((order) => {
      const items = (
        db.prepare(
          `SELECT oi.qty, p.name AS productName
           FROM OrderItem oi
           LEFT JOIN Product p ON p.id = oi.productId
           WHERE oi.orderId = ?`,
        ) as any
      ).all(order.id) as any[];
      return {
        createdAt: new Date(order.createdAt),
        status: String(order.status || ""),
        paymentStatus: String(order.paymentStatus || ""),
        totalCents: Number(order.totalCents || 0),
        items: items.map((item) => ({
          qty: Number(item.qty || 0),
          product: item.productName ? { name: String(item.productName) } : null,
        })),
      };
    });

    const products = (
      (db.prepare("SELECT name, inStock FROM Product WHERE vendorId = ?") as any).all(
        vendorId,
      ) as any[]
    ).map((product) => ({
      name: String(product.name || ""),
      inStock: Boolean(product.inStock),
    }));
    const hours = (
      (db.prepare("SELECT day FROM OperatingHour WHERE vendorId = ? AND closed = 0") as any).all(
        vendorId,
      ) as any[]
    ).map((hour) => ({ day: Number(hour.day || 0) }));
    const specials = (
      (
        db.prepare(
          "SELECT title, startsAt, endsAt, draft FROM Special WHERE vendorId = ? ORDER BY startsAt ASC",
        ) as any
      ).all(vendorId) as any[]
    ).map((special) => ({
      title: String(special.title || ""),
      startsAt: new Date(special.startsAt),
      endsAt: new Date(special.endsAt),
      draft: Boolean(special.draft),
    }));
    const lateFlags = (
      (
        db.prepare(
          `SELECT orderPublic, etaMinutes, aiMessage
         FROM LateOrderFlag
         WHERE vendorId = ? AND resolved = 0
         ORDER BY createdAt DESC
         LIMIT 3`,
        ) as any
      ).all(vendorId) as any[]
    ).map((flag) => ({
      orderPublic: String(flag.orderPublic || ""),
      etaMinutes: Number(flag.etaMinutes || 0),
      aiMessage: String(flag.aiMessage || ""),
    }));

    return {
      vendor: {
        id: String(vendor.id),
        name: String(vendor.name),
        slug: String(vendor.slug),
        status: String(vendor.status || ""),
        isActive: Boolean(vendor.isActive),
        email: vendor.email ? String(vendor.email) : null,
        suburb: vendor.suburb ? String(vendor.suburb) : null,
        city: vendor.city ? String(vendor.city) : null,
        province: vendor.province ? String(vendor.province) : null,
        municipality: vendor.municipality ? String(vendor.municipality) : null,
        township: vendor.township ? String(vendor.township) : null,
        sectionArea: vendor.sectionArea ? String(vendor.sectionArea) : null,
        storeType: vendor.storeType ? String(vendor.storeType) : null,
        phone: vendor.phone ? String(vendor.phone) : null,
        address: vendor.address ? String(vendor.address) : null,
        cuisine: vendor.cuisine ? String(vendor.cuisine) : "[]",
        deliveryFee: Number(vendor.deliveryFee || 0),
        etaMins: Number(vendor.etaMins || 30),
        latitude: vendor.latitude == null ? null : Number(vendor.latitude),
        longitude: vendor.longitude == null ? null : Number(vendor.longitude),
        kycIdUrl: vendor.kycIdUrl ? String(vendor.kycIdUrl) : null,
        kycProofUrl: vendor.kycProofUrl ? String(vendor.kycProofUrl) : null,
        bankName: vendor.bankName ? String(vendor.bankName) : null,
        bankAccountName: vendor.bankAccountName ? String(vendor.bankAccountName) : null,
        bankAccountNumber: vendor.bankAccountNumber ? String(vendor.bankAccountNumber) : null,
        bankBranchCode: vendor.bankBranchCode ? String(vendor.bankBranchCode) : null,
        updatedAt: new Date(vendor.updatedAt),
        _count: {
          products: count(db, "SELECT COUNT(*) AS n FROM Product WHERE vendorId = ?", vendorId),
          orders: count(db, 'SELECT COUNT(*) AS n FROM "Order" WHERE vendorId = ?', vendorId),
          specials: count(db, "SELECT COUNT(*) AS n FROM Special WHERE vendorId = ?", vendorId),
          hours: count(db, "SELECT COUNT(*) AS n FROM OperatingHour WHERE vendorId = ?", vendorId),
          sections: count(db, "SELECT COUNT(*) AS n FROM MenuSection WHERE vendorId = ?", vendorId),
          items: count(db, "SELECT COUNT(*) AS n FROM Item WHERE vendorId = ?", vendorId),
        },
      },
      orders,
      products,
      hours,
      specials,
      lateFlags,
    };
  } finally {
    db.close();
  }
}
