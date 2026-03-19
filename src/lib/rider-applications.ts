import { prisma } from "@/lib/db";

export type RiderApplicationStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

type RiderApplicationRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  idNumberLast4: string;
  licenseCode: string;
  suburb: string;
  city: string;
  vehicleType: string;
  vehicleRegistration: string | null;
  availableHours: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  hasSmartphone: number | boolean;
  hasBankAccount: number | boolean;
  experience: string | null;
  aiSummary: string | null;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type RiderApplicationRecord = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  idNumberLast4: string;
  licenseCode: string;
  suburb: string;
  city: string;
  vehicleType: string;
  vehicleRegistration: string | null;
  availableHours: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  hasSmartphone: boolean;
  hasBankAccount: boolean;
  experience: string | null;
  aiSummary: string | null;
  status: RiderApplicationStatus;
  createdAt: string;
  updatedAt: string;
};

function normalizeRow(row: RiderApplicationRow): RiderApplicationRecord {
  return {
    ...row,
    hasSmartphone: Boolean(row.hasSmartphone),
    hasBankAccount: Boolean(row.hasBankAccount),
    status: (String(row.status || "PENDING").toUpperCase() as RiderApplicationStatus),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function ensureRiderApplicationsTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS RiderApplication (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      idNumberLast4 TEXT NOT NULL,
      licenseCode TEXT NOT NULL,
      suburb TEXT NOT NULL,
      city TEXT NOT NULL,
      vehicleType TEXT NOT NULL,
      vehicleRegistration TEXT,
      availableHours TEXT NOT NULL,
      emergencyContactName TEXT NOT NULL,
      emergencyContactPhone TEXT NOT NULL,
      hasSmartphone INTEGER NOT NULL DEFAULT 1,
      hasBankAccount INTEGER NOT NULL DEFAULT 1,
      experience TEXT,
      aiSummary TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS RiderApplication_status_createdAt_idx
    ON RiderApplication(status, createdAt);
  `;
}

export async function createRiderApplication(input: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  idNumberLast4: string;
  licenseCode: string;
  suburb: string;
  city: string;
  vehicleType: string;
  vehicleRegistration?: string | null;
  availableHours: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  hasSmartphone: boolean;
  hasBankAccount: boolean;
  experience?: string | null;
  aiSummary?: string | null;
}) {
  await ensureRiderApplicationsTable();
  await prisma.$executeRaw`
    INSERT INTO RiderApplication (
      id, fullName, email, phone, idNumberLast4, licenseCode, suburb, city, vehicleType, vehicleRegistration,
      availableHours, emergencyContactName, emergencyContactPhone, hasSmartphone, hasBankAccount, experience,
      aiSummary, status, createdAt, updatedAt
    ) VALUES (
      ${input.id}, ${input.fullName}, ${input.email}, ${input.phone}, ${input.idNumberLast4},
      ${input.licenseCode}, ${input.suburb}, ${input.city}, ${input.vehicleType}, ${input.vehicleRegistration || null},
      ${input.availableHours}, ${input.emergencyContactName}, ${input.emergencyContactPhone},
      ${input.hasSmartphone ? 1 : 0}, ${input.hasBankAccount ? 1 : 0}, ${input.experience || null},
      ${input.aiSummary || null}, ${"PENDING"}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;
}

export async function listRiderApplications(status: RiderApplicationStatus | "ALL", take = 100) {
  await ensureRiderApplicationsTable();
  const rows =
    status === "ALL"
      ? await prisma.$queryRaw<RiderApplicationRow[]>`
          SELECT * FROM RiderApplication
          ORDER BY updatedAt DESC
          LIMIT ${take}
        `
      : await prisma.$queryRaw<RiderApplicationRow[]>`
          SELECT * FROM RiderApplication
          WHERE status = ${status}
          ORDER BY updatedAt DESC
          LIMIT ${take}
        `;

  return rows.map(normalizeRow);
}

export async function countRiderApplications(status?: RiderApplicationStatus) {
  await ensureRiderApplicationsTable();
  const rows = status
    ? await prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*) as count
        FROM RiderApplication
        WHERE status = ${status}
      `
    : await prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*) as count
        FROM RiderApplication
      `;
  return Number(rows[0]?.count || 0);
}

export async function updateRiderApplicationStatus(id: string, status: RiderApplicationStatus) {
  await ensureRiderApplicationsTable();
  await prisma.$executeRaw`
    UPDATE RiderApplication
    SET status = ${status}, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `;

  const rows = await prisma.$queryRaw<RiderApplicationRow[]>`
    SELECT * FROM RiderApplication
    WHERE id = ${id}
    LIMIT 1
  `;

  return rows[0] ? normalizeRow(rows[0]) : null;
}
