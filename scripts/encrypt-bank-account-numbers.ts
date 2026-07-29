import { PrismaClient } from "@prisma/client";
import {
  bankDataUsesDedicatedKey,
  decryptBankAccountNumber,
  encryptBankAccountNumber,
  isEncryptedBankAccountNumber,
} from "../src/lib/bank-data";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

type ProtectedRow = {
  id: string;
  bankAccountNumber: string | null;
};

function buildChanges(rows: ProtectedRow[]) {
  return rows.flatMap((row) => {
    const current = row.bankAccountNumber?.trim();
    if (!current) return [];

    const encrypted = encryptBankAccountNumber(current);
    const decrypted = decryptBankAccountNumber(encrypted);
    const expected = isEncryptedBankAccountNumber(current)
      ? decryptBankAccountNumber(current)
      : current.replace(/\s+/g, "");
    if (decrypted !== expected)
      throw new Error(`Encryption verification failed for record ${row.id}.`);

    if (current === encrypted && bankDataUsesDedicatedKey(current)) return [];
    return [{ id: row.id, encrypted }];
  });
}

async function main() {
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
  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        vendorRowsScanned: vendors.length,
        vendorRowsToUpdate: vendorChanges.length,
        riderRowsScanned: riders.length,
        riderRowsToUpdate: riderChanges.length,
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log(
      "Dry run complete. Re-run with --apply only after a verified database backup/restore test.",
    );
    return;
  }

  await prisma.$transaction([
    ...vendorChanges.map((change) =>
      prisma.vendor.update({
        where: { id: change.id },
        data: { bankAccountNumber: change.encrypted },
        select: { id: true },
      }),
    ),
    ...riderChanges.map((change) =>
      prisma.riderApplication.update({
        where: { id: change.id },
        data: { bankAccountNumber: change.encrypted },
        select: { id: true },
      }),
    ),
  ]);

  console.log("Bank data encryption migration completed successfully.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
