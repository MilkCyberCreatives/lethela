import fs from "node:fs";
import path from "node:path";
import { inferProductCategory } from "@/lib/categories";
import { prismaRuntimeInfo } from "@/lib/db";
import {
  buildPublicVendorCard,
  isPublicCatalogProduct,
  isPublicCatalogVendor,
} from "@/lib/public-catalog";
import type { ProductLite } from "@/components/ProductCard";
import type { Vendor } from "@/types";

type SqliteStatement = {
  all: (...params: unknown[]) => unknown[];
};

type SqliteProductFilters = {
  suburb?: string | null;
  category?: string | null;
  alcohol?: "true" | "false" | null;
  take?: number;
};

type SqliteVendorFilters = {
  suburb?: string | null;
  take?: number;
};

function sqliteFilePath() {
  if (prismaRuntimeInfo.provider !== "sqlite") return null;
  if (!prismaRuntimeInfo.url.startsWith("file:")) return null;
  return path.resolve(prismaRuntimeInfo.url.slice("file:".length));
}

export function canReadSqliteCatalog() {
  const filePath = sqliteFilePath();
  return Boolean(filePath && fs.existsSync(filePath));
}

function normalizeCuisine(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // Fall back to comma splitting below.
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function suburbClause(suburb?: string | null) {
  const normalized = suburb?.split(",")[0]?.trim();
  if (!normalized) return { sql: "", params: [] as string[] };
  return { sql: " AND lower(v.suburb) LIKE lower(?)", params: [`%${normalized}%`] };
}

export async function getSqliteCatalogProducts({
  suburb,
  category,
  alcohol,
  take = 30,
}: SqliteProductFilters = {}): Promise<ProductLite[] | null> {
  const filePath = sqliteFilePath();
  if (!filePath || !fs.existsSync(filePath)) return null;

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(filePath);
  try {
    const clauses = suburbClause(suburb);
    const rows = (
      db.prepare(
        `SELECT
           p.id,
           p.name,
           p.description,
           p.priceCents,
           p.image,
           p.isAlcohol,
           v.id AS vendorId,
           v.name AS vendorName,
           v.slug AS vendorSlug,
           v.deliveryFee AS deliveryFee
         FROM Product p
         INNER JOIN Vendor v ON v.id = p.vendorId
         WHERE p.inStock = 1
           AND v.isActive = 1
           AND v.status = 'ACTIVE'${clauses.sql}
         ORDER BY p.updatedAt DESC
         LIMIT ?`,
      ) as unknown as SqliteStatement
    ).all(...clauses.params, Math.min(60, Math.max(6, take))) as Array<{
      id: string;
      name: string;
      description: string | null;
      priceCents: number;
      image: string | null;
      isAlcohol: 0 | 1;
      vendorId: string;
      vendorName: string | null;
      vendorSlug: string | null;
      deliveryFee: number | null;
    }>;

    const mapped = rows
      .filter((row) =>
        isPublicCatalogProduct({
          id: row.id,
          name: row.name,
          vendorName: row.vendorName,
          vendorSlug: row.vendorSlug,
        }),
      )
      .map((row) => {
        const isAlcohol = Boolean(row.isAlcohol);
        return {
          id: row.id,
          name: row.name,
          description: row.description,
          priceCents: row.priceCents,
          image: row.image,
          isAlcohol,
          vendor: {
            id: row.vendorId,
            name: row.vendorName,
            slug: row.vendorSlug,
            deliveryFee: row.deliveryFee,
          },
          category: inferProductCategory({
            name: row.name,
            description: row.description,
            isAlcohol,
          }),
        };
      });

    return mapped.filter((item) => {
      if (alcohol === "true" && !item.isAlcohol) return false;
      if (alcohol === "false" && item.isAlcohol) return false;
      if (category && item.category?.toLowerCase() !== category.toLowerCase()) return false;
      return true;
    });
  } finally {
    db.close();
  }
}

export async function getSqliteCatalogVendors({
  suburb,
  take = 30,
}: SqliteVendorFilters = {}): Promise<Vendor[] | null> {
  const filePath = sqliteFilePath();
  if (!filePath || !fs.existsSync(filePath)) return null;

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(filePath);
  try {
    const clauses = suburbClause(suburb);
    const rows = (
      db.prepare(
        `SELECT
           v.id,
           v.name,
           v.slug,
           v.rating,
           v.cuisine,
           v.halaal,
           v.image,
           v.etaMins,
           COUNT(r.id) AS reviewCount,
           AVG(r.rating) AS averageRating,
           MAX(CASE WHEN p.isAlcohol = 1 THEN 1 ELSE 0 END) AS hasAlcohol
         FROM Vendor v
         LEFT JOIN Product p ON p.vendorId = v.id AND p.inStock = 1
         LEFT JOIN UserProductReview r ON r.vendorId = v.id
         WHERE v.isActive = 1
           AND v.status = 'ACTIVE'${clauses.sql}
         GROUP BY v.id
         ORDER BY v.updatedAt DESC
         LIMIT ?`,
      ) as unknown as SqliteStatement
    ).all(...clauses.params, Math.min(60, Math.max(6, take))) as Array<{
      id: string;
      name: string;
      slug: string;
      rating: number | null;
      cuisine: string | null;
      halaal: 0 | 1 | null;
      image: string | null;
      etaMins: number | null;
      reviewCount: number;
      averageRating: number | null;
      hasAlcohol: 0 | 1 | null;
    }>;

    return rows
      .filter((row) => isPublicCatalogVendor(row))
      .map((row) =>
        buildPublicVendorCard({
          id: row.id,
          name: row.name,
          slug: row.slug,
          rating: row.rating ?? 0,
          cuisine: normalizeCuisine(row.cuisine),
          halaal: Boolean(row.halaal),
          image: row.image,
          etaMins: row.etaMins,
          products: [{ isAlcohol: Boolean(row.hasAlcohol) }],
          reviews:
            row.reviewCount > 0 && row.averageRating
              ? Array.from({ length: row.reviewCount }, () => ({
                  rating: Number(row.averageRating),
                }))
              : [],
          baseEtaMin: row.etaMins ?? 15,
        }),
      );
  } finally {
    db.close();
  }
}

export async function getSqliteDeliveryVendor(vendorId: string): Promise<{
  id: string;
  deliveryFee: number;
} | null> {
  const filePath = sqliteFilePath();
  if (!filePath || !fs.existsSync(filePath)) return null;

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(filePath);
  try {
    const statement = db.prepare(
      `SELECT id, deliveryFee
       FROM Vendor
       WHERE id = ?
         AND isActive = 1
         AND status = 'ACTIVE'
       LIMIT 1`,
    ) as unknown as { get: (...params: unknown[]) => unknown };
    const row = statement.get(vendorId) as { id: string; deliveryFee: number | null } | undefined;
    if (!row) return null;
    return {
      id: row.id,
      deliveryFee: row.deliveryFee ?? 0,
    };
  } finally {
    db.close();
  }
}
