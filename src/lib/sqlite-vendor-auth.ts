import fs from "node:fs";
import path from "node:path";
import { prismaRuntimeInfo } from "@/lib/db";

type SqliteVendorAuthResult = {
  user: {
    id: string;
    email: string;
    passwordHash: string | null;
  };
  vendor: {
    id: string;
    name: string;
    slug: string;
    email: string | null;
    status: string;
    isActive: boolean;
    ownerId: string | null;
    role: string;
  } | null;
} | null;

function sqliteFilePath() {
  if (prismaRuntimeInfo.provider !== "sqlite") return null;
  if (!prismaRuntimeInfo.url.startsWith("file:")) return null;
  return prismaRuntimeInfo.url.slice("file:".length);
}

function rowToVendor(row: any, role: string) {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    email: row.email ? String(row.email) : null,
    status: String(row.status || ""),
    isActive: Boolean(row.isActive),
    ownerId: row.ownerId ? String(row.ownerId) : null,
    role,
  };
}

export async function findSqliteVendorLogin(
  email: string,
  slug?: string,
): Promise<SqliteVendorAuthResult> {
  const filePath = sqliteFilePath();
  if (!filePath || !fs.existsSync(filePath)) return null;

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(path.resolve(filePath));
  try {
    const user = db
      .prepare("SELECT id, email, passwordHash FROM User WHERE email = ?")
      .get(email) as any;
    if (!user) return null;

    const slugClause = slug ? "AND slug = ?" : "";
    const ownerParams = slug ? [user.id, email, slug] : [user.id, email];
    const ownerVendor = db
      .prepare(
        `SELECT id, name, slug, email, status, isActive, ownerId
         FROM Vendor
         WHERE (ownerId = ? OR email = ?) ${slugClause}
         ORDER BY updatedAt DESC
         LIMIT 1`,
      )
      .get(...ownerParams) as any;

    if (ownerVendor) {
      const member = db
        .prepare("SELECT role FROM VendorMember WHERE vendorId = ? AND userId = ? LIMIT 1")
        .get(ownerVendor.id, user.id) as any;
      if (!member && ownerVendor.ownerId === user.id) {
        (
          db.prepare(
            "INSERT INTO VendorMember (id, vendorId, userId, role, createdAt) VALUES (?, ?, ?, 'OWNER', ?)",
          ) as any
        ).run(
          `member-${ownerVendor.id}-${user.id}`,
          ownerVendor.id,
          user.id,
          new Date().toISOString(),
        );
      }

      return {
        user: {
          id: String(user.id),
          email: String(user.email),
          passwordHash: user.passwordHash ? String(user.passwordHash) : null,
        },
        vendor: rowToVendor(ownerVendor, member?.role ? String(member.role) : "OWNER"),
      };
    }

    const memberParams = slug ? [user.id, slug] : [user.id];
    const memberVendor = db
      .prepare(
        `SELECT v.id, v.name, v.slug, v.email, v.status, v.isActive, v.ownerId, vm.role
         FROM VendorMember vm
         INNER JOIN Vendor v ON v.id = vm.vendorId
         WHERE vm.userId = ? ${slug ? "AND v.slug = ?" : ""}
         ORDER BY vm.createdAt DESC
         LIMIT 1`,
      )
      .get(...memberParams) as any;

    return {
      user: {
        id: String(user.id),
        email: String(user.email),
        passwordHash: user.passwordHash ? String(user.passwordHash) : null,
      },
      vendor: memberVendor ? rowToVendor(memberVendor, String(memberVendor.role || "STAFF")) : null,
    };
  } finally {
    db.close();
  }
}

export async function findSqliteVendorSession(userId: string, vendorId: string) {
  const filePath = sqliteFilePath();
  if (!filePath || !fs.existsSync(filePath)) return null;

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(path.resolve(filePath));
  try {
    const row = db
      .prepare(
        `SELECT u.id AS userId, u.email AS userEmail,
                v.id AS vendorId, v.slug, v.name, v.status, v.isActive, v.ownerId,
                vm.role
         FROM Vendor v
         INNER JOIN User u ON u.id = ?
         LEFT JOIN VendorMember vm ON vm.vendorId = v.id AND vm.userId = u.id
         WHERE v.id = ?
         LIMIT 1`,
      )
      .get(userId, vendorId) as any;

    if (!row) return null;
    if (!row.role && row.ownerId === userId) {
      (
        db.prepare(
          "INSERT INTO VendorMember (id, vendorId, userId, role, createdAt) VALUES (?, ?, ?, 'OWNER', ?)",
        ) as any
      ).run(`member-${vendorId}-${userId}`, vendorId, userId, new Date().toISOString());
      row.role = "OWNER";
    }

    return {
      user: { id: String(row.userId), email: String(row.userEmail) },
      vendor: {
        id: String(row.vendorId),
        slug: String(row.slug),
        name: String(row.name),
        status: String(row.status || ""),
        isActive: Boolean(row.isActive),
        ownerId: row.ownerId ? String(row.ownerId) : null,
      },
      membership: row.role ? { role: String(row.role) } : null,
    };
  } finally {
    db.close();
  }
}
