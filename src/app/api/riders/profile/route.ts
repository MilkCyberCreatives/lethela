import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notifyAdminsOfRiderApplication } from "@/lib/application-notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { DELIVERY_METHODS, getRiderReadiness } from "@/lib/rider-readiness";

const PrivateFileSchema = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => !value || value.startsWith("/api/files?path=private%2F"), {
    message: "Upload this document through the protected file control.",
  });

// Empty and missing values are allowed for everything except name and phone, so riders can
// save what they have and add the rest later.
const blankIfMissing = (value: unknown) => (value === null || value === undefined ? "" : value);
const Text = (max: number) => z.preprocess(blankIfMissing, z.string().trim().max(max));
const OptionalFile = z.preprocess(blankIfMissing, PrivateFileSchema);
const OptionalTime = z.preprocess(
  blankIfMissing,
  z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .or(z.literal("")),
);
const TextList = (max: number, itemMax: number) =>
  z.preprocess(
    (value) =>
      Array.isArray(value) ? value.map((item) => String(item ?? "").trim()).filter(Boolean) : [],
    z.array(z.string().min(2).max(itemMax)).max(max),
  );

const ProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Add your full name.").max(120),
  phone: z.string().trim().min(8, "Add a phone number with at least 8 digits.").max(30),
  idNumberLast4: Text(4).refine((value) => /^\d{0,4}$/.test(value), {
    message: "Use only the last 4 digits of your ID number.",
  }),
  idDocumentUrl: OptionalFile,
  profilePhotoUrl: Text(1000),
  vehicleType: z.preprocess(
    (value) => String(value ?? "").toUpperCase(),
    z.enum(DELIVERY_METHODS).or(z.literal("")),
  ),
  vehicleRegistration: Text(40),
  vehicleMakeModel: Text(120),
  licenseCode: Text(30),
  licenceDocumentUrl: OptionalFile,
  licenceExpiry: z.string().datetime().nullable().optional(),
  vehicleDocumentUrl: OptionalFile,
  province: Text(120),
  municipality: Text(120),
  township: Text(120),
  sectionArea: Text(120),
  preferredZones: TextList(20, 120),
  workingDays: TextList(7, 20),
  startTime: OptionalTime,
  endTime: OptionalTime,
  emergencyContactName: Text(120),
  emergencyContactPhone: Text(30),
  bankAccountName: Text(160),
  bankName: Text(120),
  bankAccountNumber: z.preprocess(
    (value) => String(value ?? "").replace(/\s+/g, ""),
    z
      .string()
      .max(40)
      .refine((value) => value === "" || value.length >= 6, {
        message: "Account numbers have at least 6 digits.",
      }),
  ),
  bankBranchCode: Text(20),
  bankAccountType: Text(40),
  hasSmartphone: z.boolean().optional(),
  lawfulWorkDeclared: z.boolean().optional(),
  conductAccepted: z.boolean().optional(),
  liquorIdCheckAccepted: z.boolean().optional(),
});

const FIELD_NAMES: Record<string, string> = {
  fullName: "full name",
  phone: "phone number",
  idNumberLast4: "last 4 ID digits",
  bankAccountNumber: "account number",
  startTime: "start time",
  endTime: "end time",
};

/** True when a value that was already set is being replaced (not added for the first time). */
function replacesExisting(current: string | null | undefined, next: string | null | undefined) {
  const before = String(current ?? "").trim();
  return Boolean(before) && before !== String(next ?? "").trim();
}

async function requireRider() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in required.", status: 401 } as const;
  if (session.user.role !== "RIDER" && !["OWNER", "ADMIN"].includes(session.user.role)) {
    return { error: "Rider access required.", status: 403 } as const;
  }

  const sessionEmail = session.user.email?.trim().toLowerCase() || null;
  const riderIdentityFilters = [
    { userId: session.user.id },
    ...(sessionEmail ? [{ userId: null, email: sessionEmail }] : []),
  ];
  const profile = await prisma.riderApplication.findFirst({
    where: { OR: riderIdentityFilters },
    orderBy: { updatedAt: "desc" },
  });
  if (!profile) return { error: "Rider profile not found.", status: 404 } as const;
  return { session, profile } as const;
}

function publicProfile(profile: Awaited<ReturnType<typeof prisma.riderApplication.findFirst>>) {
  if (!profile) return null;
  const parseList = (value: string) => {
    try {
      const parsed = JSON.parse(value || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  return {
    ...profile,
    bankAccountNumber: undefined,
    bankAccountLast4: profile.bankAccountNumber?.slice(-4) || null,
    preferredZones: parseList(profile.preferredZones),
    workingDays: parseList(profile.workingDays),
  };
}

export async function GET() {
  const state = await requireRider();
  if ("error" in state) {
    return NextResponse.json({ ok: false, error: state.error }, { status: state.status });
  }
  return NextResponse.json({
    ok: true,
    profile: publicProfile(state.profile),
    readiness: getRiderReadiness(state.profile),
  });
}

export async function PATCH(req: Request) {
  const limited = await checkRateLimit({
    key: "rider-profile",
    limit: 30,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many updates. Please wait and try again." },
      { status: 429 },
    );
  }
  const state = await requireRider();
  if ("error" in state) {
    return NextResponse.json({ ok: false, error: state.error }, { status: state.status });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstMessage = Object.values(fieldErrors).flat()[0];
    const fields = Object.keys(fieldErrors).map((key) => FIELD_NAMES[key] || key);
    return NextResponse.json(
      {
        ok: false,
        error:
          fields.length === 1 && firstMessage
            ? firstMessage
            : `Check these details: ${fields.join(", ")}.`,
        fieldErrors,
      },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const current = state.profile;
  // Older profiles can hold "Scooter" rather than "SCOOTER". Treat that as the same method, and
  // keep a saved method the form could not show rather than wiping it.
  const savedMethod = current.vehicleType.trim().toUpperCase();
  const vehicleType = data.vehicleType || current.vehicleType;
  // Adding a detail for the first time never takes an approved rider offline. Changing who the
  // rider is, how they deliver or where payouts go does, until Lethela checks it again.
  const approvalSensitiveChanged =
    replacesExisting(current.fullName, data.fullName) ||
    replacesExisting(current.idNumberLast4, data.idNumberLast4) ||
    replacesExisting(current.idDocumentUrl, data.idDocumentUrl) ||
    replacesExisting(savedMethod, vehicleType.toUpperCase()) ||
    replacesExisting(current.vehicleRegistration, data.vehicleRegistration) ||
    replacesExisting(current.licenseCode, data.licenseCode) ||
    replacesExisting(current.licenceDocumentUrl, data.licenceDocumentUrl) ||
    replacesExisting(current.vehicleDocumentUrl, data.vehicleDocumentUrl) ||
    replacesExisting(current.bankAccountName, data.bankAccountName) ||
    replacesExisting(current.bankName, data.bankName) ||
    (Boolean(data.bankAccountNumber) &&
      replacesExisting(current.bankAccountNumber, data.bankAccountNumber)) ||
    replacesExisting(current.bankBranchCode, data.bankBranchCode);
  const demoteApproved = current.status === "APPROVED" && approvalSensitiveChanged;
  const nextStatus =
    ["CHANGES_REQUESTED", "REJECTED"].includes(current.status) || demoteApproved
      ? "DRAFT"
      : current.status;
  const bankAccountNumber = data.bankAccountNumber || current.bankAccountNumber;
  const hasHours = data.workingDays.length > 0 && data.startTime && data.endTime;
  const profile = await prisma.riderApplication.update({
    where: { id: current.id },
    data: {
      userId: current.userId || state.session.user.id,
      fullName: data.fullName,
      phone: data.phone,
      idNumberLast4: data.idNumberLast4,
      idDocumentUrl: data.idDocumentUrl || null,
      profilePhotoUrl: data.profilePhotoUrl || null,
      vehicleType,
      vehicleRegistration: data.vehicleRegistration || null,
      vehicleMakeModel: data.vehicleMakeModel || null,
      licenseCode: data.licenseCode,
      licenceDocumentUrl: data.licenceDocumentUrl || null,
      licenceExpiry: data.licenceExpiry ? new Date(data.licenceExpiry) : null,
      vehicleDocumentUrl: data.vehicleDocumentUrl || null,
      province: data.province,
      municipality: data.municipality,
      township: data.township,
      suburb: data.township,
      city: data.municipality,
      sectionArea: data.sectionArea || null,
      preferredZones: JSON.stringify(data.preferredZones),
      workingDays: JSON.stringify(data.workingDays),
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      availableHours: hasHours
        ? `${data.workingDays.join(", ")} ${data.startTime}-${data.endTime}`
        : "",
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      bankAccountName: data.bankAccountName || null,
      bankName: data.bankName || null,
      bankAccountNumber,
      bankBranchCode: data.bankBranchCode || null,
      bankAccountType: data.bankAccountType || null,
      hasBankAccount: Boolean(bankAccountNumber),
      hasSmartphone: data.hasSmartphone ?? current.hasSmartphone,
      lawfulWorkDeclared: data.lawfulWorkDeclared ?? current.lawfulWorkDeclared,
      conductAccepted: data.conductAccepted ?? current.conductAccepted,
      liquorIdCheckAccepted: data.liquorIdCheckAccepted ?? current.liquorIdCheckAccepted,
      status: nextStatus,
      reviewReason: demoteApproved
        ? "Profile changes need Lethela's approval before you can take deliveries again."
        : current.reviewReason,
      // Going online and offline happens on the deliveries page, not through profile saves.
      availableNow: demoteApproved ? false : current.availableNow,
    },
  });
  return NextResponse.json({
    ok: true,
    profile: publicProfile(profile),
    readiness: getRiderReadiness(profile),
  });
}

export async function POST() {
  const state = await requireRider();
  if ("error" in state) {
    return NextResponse.json({ ok: false, error: state.error }, { status: state.status });
  }
  const readiness = getRiderReadiness(state.profile);
  if (!readiness.canSubmit) {
    return NextResponse.json(
      {
        ok: false,
        error: `Add these first: ${readiness.missing.join(", ").toLowerCase()}.`,
        readiness,
      },
      { status: 422 },
    );
  }
  if (["SUSPENDED", "APPROVED", "UNDER_REVIEW"].includes(state.profile.status)) {
    return NextResponse.json(
      { ok: false, error: "This profile cannot be submitted in its current state." },
      { status: 409 },
    );
  }
  const profile = await prisma.riderApplication.update({
    where: { id: state.profile.id },
    data: { status: "SUBMITTED", submittedAt: new Date(), reviewReason: null, availableNow: false },
  });
  await notifyAdminsOfRiderApplication({
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    suburb: profile.township || profile.suburb,
    city: profile.municipality || profile.city,
    vehicleType: profile.vehicleType,
  }).catch(() => null);
  return NextResponse.json({
    ok: true,
    message: "Rider profile submitted for approval.",
    profile: publicProfile(profile),
  });
}
