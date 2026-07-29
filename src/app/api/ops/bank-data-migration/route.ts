import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  decryptBankAccountNumber,
  encryptBankAccountNumber,
  isEncryptedBankAccountNumber,
} from "@/lib/bank-data";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_HASH = "0a7dd7eaa74c3d8a0b011e2a90c0e86d68f318909293791261c8abfb2259351c";
const EXPIRES_AT = Date.parse("2026-07-30T12:00:00Z");

type ProtectedRow = {
  id: string;
  bankAccountNumber: string | null;
};

function secureEqualToken(token: string) {
  const supplied = Buffer.from(crypto.createHash("sha256").update(token).digest("hex"));
  const expected = Buffer.from(TOKEN_HASH);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function buildChanges(rows: ProtectedRow[]) {
  return rows.flatMap((row) => {
    const current = row.bankAccountNumber?.trim();
    if (!current) return [];

    const encrypted = encryptBankAccountNumber(current);
    const expected = isEncryptedBankAccountNumber(current)
      ? decryptBankAccountNumber(current)
      : current.replace(/\s+/g, "");
    if (decryptBankAccountNumber(encrypted) !== expected) {
      throw new Error("Bank data verification failed before update.");
    }
    if (current === encrypted) return [];
    return [{ id: row.id, encrypted }];
  });
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "production") return json({ ok: false }, 404);
  if (Date.now() > EXPIRES_AT) return json({ ok: false, error: "Migration window expired." }, 410);

  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const mode = url.searchParams.get("mode");
  if (!secureEqualToken(token)) return json({ ok: false }, 404);
  if (mode !== "dry-run" && mode !== "apply") {
    return json({ ok: false, error: "Mode must be dry-run or apply." }, 400);
  }

  const [vendors, riders] = await Promise.all([
    prisma.vendor.findMany({
      where: { bankAccountNumber: { not: null } },
      select: { id: true, bankAccountNumber: true },
    }),
    prisma.riderApplication.findMany({
      where: { bankAccountNumber: { not: null } },
      select: { id: true, bankAccountNumber: true },
    }),
  ]);

  const vendorChanges = buildChanges(vendors);
  const riderChanges = buildChanges(riders);
  const result = {
    vendorRowsScanned: vendors.length,
    vendorRowsToUpdate: vendorChanges.length,
    riderRowsScanned: riders.length,
    riderRowsToUpdate: riderChanges.length,
  };

  if (mode === "dry-run") return json({ ok: true, mode, ...result });

  const unprotectedRows = await prisma.$transaction(async (tx) => {
    for (const change of vendorChanges) {
      await tx.vendor.update({
        where: { id: change.id },
        data: { bankAccountNumber: change.encrypted },
        select: { id: true },
      });
    }
    for (const change of riderChanges) {
      await tx.riderApplication.update({
        where: { id: change.id },
        data: { bankAccountNumber: change.encrypted },
        select: { id: true },
      });
    }

    const [verifiedVendors, verifiedRiders] = await Promise.all([
      tx.vendor.findMany({
        where: { bankAccountNumber: { not: null } },
        select: { bankAccountNumber: true },
      }),
      tx.riderApplication.findMany({
        where: { bankAccountNumber: { not: null } },
        select: { bankAccountNumber: true },
      }),
    ]);
    const remaining = [...verifiedVendors, ...verifiedRiders].filter(
      (row) => row.bankAccountNumber && !isEncryptedBankAccountNumber(row.bankAccountNumber),
    ).length;
    if (remaining) throw new Error("Post-migration verification failed.");
    return remaining;
  });

  return json({ ok: true, mode, ...result, unprotectedRows });
}
