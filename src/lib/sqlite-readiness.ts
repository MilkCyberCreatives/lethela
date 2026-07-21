import fs from "node:fs";
import path from "node:path";
import { prismaRuntimeInfo } from "@/lib/db";

type SqliteCounts = {
  activeVendors: number;
  activeProducts: number;
  pendingVendors: number;
  pendingRiders: number;
  underReviewRiders: number;
  approvedRiders: number;
  paidOrders: number;
  paidOrders24h: number;
  users: number;
};

function sqliteFilePath() {
  if (prismaRuntimeInfo.provider !== "sqlite") return null;
  if (!prismaRuntimeInfo.url.startsWith("file:")) return null;
  return prismaRuntimeInfo.url.slice("file:".length);
}

function count(db: any, sql: string, ...params: unknown[]) {
  return Number(db.prepare(sql).get(...params)?.n || 0);
}

export async function getSqliteReadinessCounts(): Promise<SqliteCounts | null> {
  const filePath = sqliteFilePath();
  if (!filePath || !fs.existsSync(filePath)) return null;

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(path.resolve(filePath));
  try {
    const paidSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return {
      activeVendors: count(
        db,
        `SELECT COUNT(*) AS n
         FROM Vendor v
         WHERE v.isActive = 1
           AND v.status IN ('ACTIVE', 'APPROVED')
           AND v.phone IS NOT NULL
           AND v.address IS NOT NULL
           AND v.city IS NOT NULL
           AND v.province IS NOT NULL
           AND v.storeType IS NOT NULL
           AND v.kycIdUrl IS NOT NULL
           AND v.kycProofUrl IS NOT NULL
           AND v.bankName IS NOT NULL
           AND v.bankAccountName IS NOT NULL
           AND v.bankAccountNumber IS NOT NULL
           AND EXISTS (SELECT 1 FROM OperatingHour oh WHERE oh.vendorId = v.id AND oh.closed = 0)
           AND EXISTS (SELECT 1 FROM Product p WHERE p.vendorId = v.id AND p.inStock = 1 AND p.isAlcohol = 0)`,
      ),
      activeProducts: count(
        db,
        `SELECT COUNT(*) AS n
         FROM Product p
         INNER JOIN Vendor v ON v.id = p.vendorId
         WHERE p.inStock = 1
           AND p.isAlcohol = 0
           AND v.isActive = 1
           AND v.status IN ('ACTIVE', 'APPROVED')
           AND v.phone IS NOT NULL
           AND v.address IS NOT NULL
           AND v.city IS NOT NULL
           AND v.province IS NOT NULL
           AND v.storeType IS NOT NULL
           AND v.kycIdUrl IS NOT NULL
           AND v.kycProofUrl IS NOT NULL
           AND v.bankName IS NOT NULL
           AND v.bankAccountName IS NOT NULL
           AND v.bankAccountNumber IS NOT NULL
           AND EXISTS (SELECT 1 FROM OperatingHour oh WHERE oh.vendorId = v.id AND oh.closed = 0)`,
      ),
      pendingVendors: count(
        db,
        "SELECT COUNT(*) AS n FROM Vendor WHERE status IN ('SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED')",
      ),
      pendingRiders: count(
        db,
        "SELECT COUNT(*) AS n FROM RiderApplication WHERE status = 'SUBMITTED'",
      ),
      underReviewRiders: count(
        db,
        "SELECT COUNT(*) AS n FROM RiderApplication WHERE status = 'UNDER_REVIEW'",
      ),
      approvedRiders: count(
        db,
        "SELECT COUNT(*) AS n FROM RiderApplication WHERE status = 'APPROVED'",
      ),
      paidOrders: count(
        db,
        "SELECT COUNT(*) AS n FROM \"Order\" WHERE paymentStatus IN ('PAID', 'SUCCESS')",
      ),
      paidOrders24h: count(
        db,
        "SELECT COUNT(*) AS n FROM \"Order\" WHERE paymentStatus IN ('PAID', 'SUCCESS') AND createdAt >= ?",
        paidSince,
      ),
      users: count(db, "SELECT COUNT(*) AS n FROM User"),
    };
  } finally {
    db.close();
  }
}
