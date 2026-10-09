import { prisma } from "@/lib/db";
import { getRiderReadiness } from "@/lib/rider-readiness";

export type RiderApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "OFFLINE"
  | "AVAILABLE"
  | "BUSY";

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
  province: string;
  township: string;
  municipality: string;
  reviewReason: string | null;
  hasIdDocument: boolean;
  hasPhoto: boolean;
  hasLicenceDocument: boolean;
  /** Whether the rider can sign in (password or Google). Only set by list queries. */
  accountCanSignIn?: boolean;
  readiness: { canApprove: boolean; missing: string[]; later: string[] };
};

type RiderApplicationModel = Awaited<ReturnType<typeof prisma.riderApplication.findFirst>>;

function normalizeStatus(value: string | null | undefined): RiderApplicationStatus {
  const upper = String(value || "DRAFT").toUpperCase();
  if (upper === "PENDING") return "SUBMITTED";
  if (
    [
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "CHANGES_REQUESTED",
      "APPROVED",
      "REJECTED",
      "SUSPENDED",
      "OFFLINE",
      "AVAILABLE",
      "BUSY",
    ].includes(upper)
  ) {
    return upper as RiderApplicationStatus;
  }
  return "DRAFT";
}

type RiderUserAccess = {
  passwordHash: string | null;
  accounts: Array<{ provider: string }>;
} | null;

function normalizeRow(
  row: NonNullable<RiderApplicationModel>,
  user?: RiderUserAccess,
): RiderApplicationRecord {
  const readiness = getRiderReadiness(row);
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
    province: row.province,
    township: row.township,
    municipality: row.municipality,
    reviewReason: row.reviewReason,
    hasIdDocument: Boolean(row.idDocumentUrl),
    hasPhoto: Boolean(row.profilePhotoUrl),
    hasLicenceDocument: Boolean(row.licenceDocumentUrl),
    accountCanSignIn:
      user === undefined
        ? undefined
        : Boolean(user?.passwordHash) || Boolean(user?.accounts.length),
    readiness: {
      canApprove: readiness.canSubmit,
      missing: readiness.missing,
      later: readiness.later,
    },
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
      status: "SUBMITTED",
    },
  });
}

export async function listRiderApplications(status: RiderApplicationStatus | "ALL", take = 100) {
  const rows = await prisma.riderApplication.findMany({
    where: status === "ALL" ? undefined : { status },
    orderBy: { updatedAt: "desc" },
    take,
    include: {
      user: { select: { passwordHash: true, accounts: { select: { provider: true }, take: 1 } } },
    },
  });
  return rows.map(({ user, ...row }) => normalizeRow(row, user));
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
