import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiChat } from "@/lib/ai";
import { prisma } from "@/lib/db";

const RiderApplySchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  phone: z.string().trim().min(8).max(40),
  idNumberLast4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "ID last 4 digits must be exactly 4 digits"),
  licenseCode: z.string().trim().min(2).max(30),
  suburb: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  vehicleType: z.enum(["BIKE", "SCOOTER", "CAR"]),
  vehicleRegistration: z.string().trim().max(20).optional().nullable(),
  availableHours: z.string().trim().min(2).max(120),
  emergencyContactName: z.string().trim().min(3).max(120),
  emergencyContactPhone: z.string().trim().min(8).max(40),
  hasSmartphone: z.boolean(),
  hasBankAccount: z.boolean(),
  experience: z.string().trim().max(1200).optional().nullable(),
});

async function ensureRiderApplicationsTable() {
  await prisma.$executeRawUnsafe(`
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
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS RiderApplication_status_createdAt_idx
    ON RiderApplication(status, createdAt);
  `);
}

export async function POST(req: Request) {
  const raw = await req.json().catch(() => ({}));
  const parsed = RiderApplySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid rider application data", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const summary = await aiChat([
    {
      role: "system",
      content:
        "You review last-mile delivery rider applications for South Africa. Return one concise plain-text ops summary with strengths and risk checks.",
    },
    {
      role: "user",
      content: `
Applicant: ${payload.fullName}
Email: ${payload.email}
Phone: ${payload.phone}
Area: ${payload.suburb}, ${payload.city}
Vehicle: ${payload.vehicleType}${payload.vehicleRegistration ? ` (${payload.vehicleRegistration})` : ""}
License: ${payload.licenseCode}
ID last 4: ${payload.idNumberLast4}
Availability: ${payload.availableHours}
Smartphone: ${payload.hasSmartphone ? "Yes" : "No"}
Bank account: ${payload.hasBankAccount ? "Yes" : "No"}
Emergency contact: ${payload.emergencyContactName} (${payload.emergencyContactPhone})
Experience: ${payload.experience || "N/A"}
`,
    },
  ]);

  await ensureRiderApplicationsTable();
  const applicationId = randomUUID();

  await prisma.$executeRaw`
    INSERT INTO RiderApplication (
      id, fullName, email, phone, idNumberLast4, licenseCode, suburb, city, vehicleType, vehicleRegistration,
      availableHours, emergencyContactName, emergencyContactPhone, hasSmartphone, hasBankAccount, experience,
      aiSummary, status, createdAt, updatedAt
    ) VALUES (
      ${applicationId}, ${payload.fullName}, ${payload.email}, ${payload.phone}, ${payload.idNumberLast4},
      ${payload.licenseCode}, ${payload.suburb}, ${payload.city}, ${payload.vehicleType}, ${payload.vehicleRegistration || null},
      ${payload.availableHours}, ${payload.emergencyContactName}, ${payload.emergencyContactPhone},
      ${payload.hasSmartphone ? 1 : 0}, ${payload.hasBankAccount ? 1 : 0}, ${payload.experience || null},
      ${summary.slice(0, 1200)}, ${"PENDING"}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;

  return NextResponse.json({
    ok: true,
    application: {
      id: applicationId,
      status: "PENDING",
    },
    summary: summary.slice(0, 1200),
    message: "Application submitted. Ops will review and contact you on WhatsApp.",
  });
}
