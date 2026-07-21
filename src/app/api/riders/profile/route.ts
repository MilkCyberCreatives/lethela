import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRiderReadiness } from "@/lib/rider-readiness";

const DeliveryMethods = ["WALKING", "BICYCLE", "SCOOTER", "MOTORCYCLE", "CAR"] as const;
const PrivateFileSchema = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => !value || value.startsWith("/api/files?path=private%2F"), {
    message: "Upload this document through the protected file control.",
  });
const ProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  idNumberLast4: z.string().regex(/^\d{0,4}$/),
  idDocumentUrl: PrivateFileSchema,
  profilePhotoUrl: z.string().trim().max(1000),
  vehicleType: z.enum(DeliveryMethods),
  vehicleRegistration: z.string().trim().max(40).nullable().optional(),
  vehicleMakeModel: z.string().trim().max(120).nullable().optional(),
  licenseCode: z.string().trim().max(30).nullable().optional(),
  licenceDocumentUrl: PrivateFileSchema.nullable().optional(),
  licenceExpiry: z.string().datetime().nullable().optional(),
  vehicleDocumentUrl: PrivateFileSchema.nullable().optional(),
  province: z.string().trim().max(120),
  municipality: z.string().trim().max(120),
  township: z.string().trim().max(120),
  sectionArea: z.string().trim().max(120).nullable().optional(),
  preferredZones: z.array(z.string().trim().min(2).max(120)).max(20),
  availableNow: z.boolean(),
  workingDays: z.array(z.string().trim().min(2).max(20)).max(7),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .or(z.literal("")),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .or(z.literal("")),
  bankAccountName: z.string().trim().max(160),
  bankName: z.string().trim().max(120),
  bankAccountNumber: z.string().trim().min(6).max(40).optional(),
  bankBranchCode: z.string().trim().max(20),
  bankAccountType: z.string().trim().max(40),
  hasSmartphone: z.boolean(),
  lawfulWorkDeclared: z.boolean(),
  conductAccepted: z.boolean(),
  liquorIdCheckAccepted: z.boolean(),
});

async function requireRider() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in required.", status: 401 } as const;
  if (session.user.role !== "RIDER" && !["OWNER", "ADMIN"].includes(session.user.role)) {
    return { error: "Rider access required.", status: 403 } as const;
  }
  const profile = await prisma.riderApplication.findFirst({
    where: { OR: [{ userId: session.user.id }, { email: session.user.email.toLowerCase() }] },
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
    return NextResponse.json(
      {
        ok: false,
        error: "Complete the highlighted profile fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const approvalSensitiveChanged =
    state.profile.fullName !== data.fullName ||
    state.profile.phone !== data.phone ||
    state.profile.idNumberLast4 !== data.idNumberLast4 ||
    state.profile.idDocumentUrl !== data.idDocumentUrl ||
    state.profile.vehicleType !== data.vehicleType ||
    state.profile.vehicleRegistration !== (data.vehicleRegistration || null) ||
    state.profile.vehicleMakeModel !== (data.vehicleMakeModel || null) ||
    state.profile.licenseCode !== (data.licenseCode || "") ||
    state.profile.licenceDocumentUrl !== (data.licenceDocumentUrl || null) ||
    (state.profile.licenceExpiry?.toISOString() || null) !== (data.licenceExpiry || null) ||
    state.profile.vehicleDocumentUrl !== (data.vehicleDocumentUrl || null) ||
    state.profile.province !== data.province ||
    state.profile.municipality !== data.municipality ||
    state.profile.township !== data.township ||
    state.profile.bankAccountName !== data.bankAccountName ||
    state.profile.bankName !== data.bankName ||
    Boolean(data.bankAccountNumber) ||
    state.profile.bankBranchCode !== data.bankBranchCode ||
    state.profile.bankAccountType !== data.bankAccountType;
  const nextStatus =
    ["CHANGES_REQUESTED", "REJECTED"].includes(state.profile.status) ||
    (state.profile.status === "APPROVED" && approvalSensitiveChanged)
      ? "DRAFT"
      : state.profile.status;
  const profile = await prisma.riderApplication.update({
    where: { id: state.profile.id },
    data: {
      userId: state.profile.userId || state.session.user.id,
      fullName: data.fullName,
      phone: data.phone,
      idNumberLast4: data.idNumberLast4,
      idDocumentUrl: data.idDocumentUrl,
      profilePhotoUrl: data.profilePhotoUrl,
      vehicleType: data.vehicleType,
      vehicleRegistration: data.vehicleRegistration || null,
      vehicleMakeModel: data.vehicleMakeModel || null,
      licenseCode: data.licenseCode || "",
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
      startTime: data.startTime,
      endTime: data.endTime,
      availableHours: `${data.workingDays.join(", ")} ${data.startTime}-${data.endTime}`,
      bankAccountName: data.bankAccountName,
      bankName: data.bankName,
      bankAccountNumber: data.bankAccountNumber || state.profile.bankAccountNumber,
      bankBranchCode: data.bankBranchCode,
      bankAccountType: data.bankAccountType,
      hasBankAccount: Boolean(data.bankAccountNumber || state.profile.bankAccountNumber),
      hasSmartphone: data.hasSmartphone,
      lawfulWorkDeclared: data.lawfulWorkDeclared,
      conductAccepted: data.conductAccepted,
      liquorIdCheckAccepted: data.liquorIdCheckAccepted,
      status: nextStatus,
      reviewReason:
        state.profile.status === "APPROVED" && approvalSensitiveChanged
          ? "Profile changes require approval before accepting deliveries."
          : state.profile.reviewReason,
      availableNow:
        state.profile.status === "APPROVED" && approvalSensitiveChanged ? false : data.availableNow,
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
      { ok: false, error: "Complete every required section before submitting.", readiness },
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
  return NextResponse.json({
    ok: true,
    message: "Rider profile submitted for approval.",
    profile: publicProfile(profile),
  });
}
