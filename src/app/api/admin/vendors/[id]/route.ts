import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { prisma, prismaRuntimeInfo } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";
import { notifyApplicant } from "@/lib/application-notifications";
import { logAdminAudit } from "@/lib/admin-audit";
import { getVendorReadiness } from "@/lib/vendor-readiness";

const ActionSchema = z.object({
  action: z.enum(["approve", "reject", "changes_requested", "suspend"]),
  reason: z.string().trim().max(500).optional(),
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

function statusForAction(action: z.infer<typeof ActionSchema>["action"]) {
  if (action === "approve") return { status: "APPROVED", isActive: true };
  if (action === "changes_requested") return { status: "CHANGES_REQUESTED", isActive: false };
  if (action === "suspend") return { status: "SUSPENDED", isActive: false };
  return { status: "REJECTED", isActive: false };
}

async function updateLocalSqliteVendorStatus(
  id: string,
  action: z.infer<typeof ActionSchema>["action"],
  reason?: string,
) {
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
    const next = statusForAction(action);
    run("BEGIN IMMEDIATE");
    try {
      run(
        "UPDATE Vendor SET status = ?, isActive = ?, reviewReason = ?, updatedAt = ? WHERE id = ?",
        next.status,
        next.isActive ? 1 : 0,
        action === "approve" ? null : reason || null,
        now,
        id,
      );

      if (next.isActive && existing.email) {
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
  const guard = await requireAdminRequest(req, "vendors:approve");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid action payload." }, { status: 400 });
  }

  const action = parsed.data.action;
  if (action !== "approve" && !parsed.data.reason) {
    return NextResponse.json(
      { ok: false, error: "A reason is required for this action." },
      { status: 400 },
    );
  }
  const next = statusForAction(action);

  const reviewCandidate = await prisma.vendor.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      suburb: true,
      city: true,
      province: true,
      municipality: true,
      township: true,
      sectionArea: true,
      storeType: true,
      cuisine: true,
      etaMins: true,
      kycIdUrl: true,
      kycProofUrl: true,
      bankName: true,
      bankAccountName: true,
      bankAccountNumber: true,
      bankBranchCode: true,
      owner: { select: { passwordHash: true } },
      _count: { select: { products: true, items: true, hours: true } },
    },
  });
  if (!reviewCandidate) {
    return NextResponse.json({ ok: false, error: "Vendor not found." }, { status: 404 });
  }
  if (action === "approve") {
    const readiness = getVendorReadiness({
      ...reviewCandidate,
      productCount: reviewCandidate._count.products,
      menuItemCount: reviewCandidate._count.items,
      operatingHoursCount: reviewCandidate._count.hours,
    });
    if (!readiness.canSubmit) {
      return NextResponse.json(
        {
          ok: false,
          error: "This vendor profile is incomplete and cannot be approved.",
          readiness,
        },
        { status: 409 },
      );
    }
    if (!reviewCandidate.owner?.passwordHash) {
      return NextResponse.json(
        { ok: false, error: "Link a securely registered owner account before approval." },
        { status: 409 },
      );
    }
  }

  if (isLocalSqliteRuntime()) {
    const vendor = await updateLocalSqliteVendorStatus(id, action, parsed.data.reason);
    if (!vendor) {
      return NextResponse.json({ ok: false, error: "Vendor not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      vendor,
      message: `Vendor ${next.status.replaceAll("_", " ").toLowerCase()}.`,
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
        status: next.status,
        isActive: next.isActive,
        reviewReason: action === "approve" ? null : parsed.data.reason,
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

    if (next.isActive && updated.email) {
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
    actor: guard.actor,
    action: `${action}_vendor`,
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
      status: next.isActive ? "approved" : "rejected",
      reference: vendor.slug,
    });
  }

  return NextResponse.json({
    ok: true,
    vendor,
    message: `Vendor ${next.status.replaceAll("_", " ").toLowerCase()}.`,
  });
}
