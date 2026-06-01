import { prisma } from "@/lib/db";

export type RiderApplicationStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

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

type RiderApplicationModel = Awaited<ReturnType<typeof prisma.riderApplication.findFirst>>;

function normalizeStatus(value: string | null | undefined): RiderApplicationStatus {
  const upper = String(value || "PENDING").toUpperCase();
  if (upper === "UNDER_REVIEW" || upper === "APPROVED" || upper === "REJECTED") {
    return upper;
  }
  return "PENDING";
}

function normalizeRow(row: NonNullable<RiderApplicationModel>): RiderApplicationRecord {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    idNumberLast4: row.idNumberLast4,
    licenseCode: row.licenseCode,
    suburb: row.suburb,
    city: row.city,
    vehicleType: row.vehicleType,
    vehicleRegistration: row.vehicleRegistration,
    availableHours: row.availableHours,
    emergencyContactName: row.emergencyContactName,
    emergencyContactPhone: row.emergencyContactPhone,
    hasSmartphone: row.hasSmartphone,
    hasBankAccount: row.hasBankAccount,
    experience: row.experience,
    aiSummary: row.aiSummary,
    status: normalizeStatus(row.status),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
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
  await prisma.riderApplication.create({
    data: {
      id: input.id,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      idNumberLast4: input.idNumberLast4,
      licenseCode: input.licenseCode,
      suburb: input.suburb,
      city: input.city,
      vehicleType: input.vehicleType,
      vehicleRegistration: input.vehicleRegistration || null,
      availableHours: input.availableHours,
      emergencyContactName: input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone,
      hasSmartphone: input.hasSmartphone,
      hasBankAccount: input.hasBankAccount,
      experience: input.experience || null,
      aiSummary: input.aiSummary || null,
      status: "PENDING",
    },
  });
}

export async function listRiderApplications(status: RiderApplicationStatus | "ALL", take = 100) {
  const rows = await prisma.riderApplication.findMany({
    where: status === "ALL" ? undefined : { status },
    orderBy: { updatedAt: "desc" },
    take,
  });
  return rows.map(normalizeRow);
}

export async function countRiderApplications(status?: RiderApplicationStatus) {
  return prisma.riderApplication.count({
    where: status ? { status } : undefined,
  });
}

export async function updateRiderApplicationStatus(id: string, status: RiderApplicationStatus) {
  const existing = await prisma.riderApplication.findUnique({ where: { id } });
  if (!existing) return null;

  const item = await prisma.riderApplication.update({
    where: { id },
    data: { status },
  });

  return normalizeRow(item);
}
