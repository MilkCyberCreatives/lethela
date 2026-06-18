import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { prisma, prismaRuntimeInfo } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";
import { notifyApplicant } from "@/lib/application-notifications";
import { logAdminAudit } from "@/lib/admin-audit";

const ActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

function isLocalSqliteRuntime() {
  return (
    !process.env.VERCEL &&
    (process.env.DATABASE_PROVIDER?.trim().toLowerCase() === "sqlite" ||
      process.env.DATABASE_URL?.trim().toLowerCase().startsWith("file:"))
  );
}

function sqliteFilePath() {
  if (prismaRuntimeInfo.provider !== "sqlite") return null;
  if (!prismaRuntimeInfo.url.startsWith("file:")) return null;
  return prismaRuntimeInfo.url.slice("file:".length);
}

async function updateLocalSqliteVendorStatus(id: string, approved: boolean) {
  const filePath = sqliteFilePath();
  if (!filePath || !fs.existsSync(filePath)) return null;

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(path.resolve(filePath));
  const run = (sql: string, ...params: unknown[]) => (db.prepare(sql) as any).run(...params);
  try {
    const existing = db
      .prepare("SELECT id, email, ownerId FROM Vendor WHERE id = ? LIMIT 1")
      .get(id) as { id: string; email: string | null; ownerId: string | null } | undefined;
    if (!existing) return null;

    const now = new Date().toISOString();
    run("BEGIN IMMEDIATE");
    try {
      run(
        "UPDATE Vendor SET status = ?, isActive = ?, updatedAt = ? WHERE id = ?",
        approved ? "ACTIVE" : "REJECTED",
        approved ? 1 : 0,
        now,
        id,
      );

      if (approved && existing.email) {
        const normalizedEmail = existing.email.toLowerCase();
        let user = existing.ownerId
          ? (db
              .prepare("SELECT id, email, role FROM User WHERE id = ? LIMIT 1")
              .get(existing.ownerId) as { id: string; email: string; role: string } | undefined)
          : undefined;

        if (!user) {
          user = db
            .prepare("SELECT id, email, role FROM User WHERE lower(email) = lower(?) LIMIT 1")
            .get(normalizedEmail) as { id: string; email: string; role: string } | undefined;
        }

        const userId = user?.id || `vendor-owner-${id}`;
        if (user) {
          run(
            "UPDATE User SET email = ?, role = ?, updatedAt = ? WHERE id = ?",
            normalizedEmail,
            user.role === "ADMIN" ? "ADMIN" : "VENDOR",
            now,
            user.id,
          );
        } else {
          run(
            "INSERT INTO User (id, email, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
            userId,
            normalizedEmail,
            "VENDOR",
            now,
            now,
          );
        }

        run("UPDATE Vendor SET ownerId = ? WHERE id = ?", userId, id);

        const member = db
          .prepare("SELECT id FROM VendorMember WHERE vendorId = ? AND userId = ? LIMIT 1")
          .get(id, userId) as { id: string } | undefined;
        if (member) {
          run("UPDATE VendorMember SET role = ? WHERE id = ?", "OWNER", member.id);
        } else {
          run(
            "INSERT INTO VendorMember (id, vendorId, userId, role, createdAt) VALUES (?, ?, ?, ?, ?)",
            `member-${id}-${userId}`,
            id,
            userId,
            "OWNER",
            now,
          );
        }
      }

      run("COMMIT");
    } catch (error) {
      run("ROLLBACK");
      throw error;
    }

    const vendor = db
      .prepare(
        "SELECT id, name, slug, email, phone, status, isActive, updatedAt FROM Vendor WHERE id = ? LIMIT 1",
      )
      .get(id) as any;

    return {
      id: String(vendor.id),
      name: String(vendor.name),
      slug: String(vendor.slug),
      email: vendor.email ? String(vendor.email) : null,
      phone: vendor.phone ? String(vendor.phone) : null,
      status: String(vendor.status),
      isActive: Boolean(vendor.isActive),
      updatedAt: vendor.updatedAt,
    };
  } finally {
    db.close();
  }
}

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid action payload." }, { status: 400 });
  }

  const approved = parsed.data.action === "approve";

  if (isLocalSqliteRuntime()) {
    const vendor = await updateLocalSqliteVendorStatus(id, approved);
    if (!vendor) {
      return NextResponse.json({ ok: false, error: "Vendor not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      vendor,
      message: approved ? "Vendor approved." : "Vendor rejected.",
    });
  }

  const existing = await prisma.vendor.findUnique({
    where: { id },
    select: { id: true, email: true, status: true, ownerId: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Vendor not found." }, { status: 404 });
  }

  const vendor = await prisma.$transaction(async (tx) => {
    const updated = await tx.vendor.update({
      where: { id: existing.id },
      data: {
        status: approved ? "ACTIVE" : "REJECTED",
        isActive: approved,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        status: true,
        isActive: true,
        updatedAt: true,
      },
    });

    if (approved && updated.email) {
      const normalizedEmail = updated.email.toLowerCase();
      const ownerUser = existing.ownerId
        ? await tx.user.findUnique({
            where: { id: existing.ownerId },
            select: { id: true, email: true, role: true },
          })
        : null;
      const existingUser =
        ownerUser ||
        (await tx.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true, email: true, role: true },
        }));

      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              email: normalizedEmail,
              role: existingUser.role === "ADMIN" ? "ADMIN" : "VENDOR",
            },
            select: { id: true },
          })
        : await tx.user.create({
            data: {
              email: normalizedEmail,
              role: "VENDOR",
            },
            select: { id: true },
          });

      await tx.vendor.update({
        where: { id: updated.id },
        data: { ownerId: user.id },
      });

      await tx.vendorMember.upsert({
        where: {
          vendorId_userId: {
            vendorId: updated.id,
            userId: user.id,
          },
        },
        update: { role: "OWNER" },
        create: {
          vendorId: updated.id,
          userId: user.id,
          role: "OWNER",
        },
      });
    }

    return updated;
  });

  await logAdminAudit({
    actor: guard.mode,
    action: approved ? "approve_vendor" : "reject_vendor",
    targetType: "vendor",
    targetId: vendor.id,
    before: { status: existing.status, ownerId: existing.ownerId },
    after: { status: vendor.status, isActive: vendor.isActive },
  });

  if (!isLocalSqliteRuntime() && vendor.email && vendor.phone) {
    await notifyApplicant({
      kind: "vendor",
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      status: approved ? "approved" : "rejected",
      reference: vendor.slug,
    });
  }

  return NextResponse.json({
    ok: true,
    vendor,
    message: approved ? "Vendor approved." : "Vendor rejected.",
  });
}
