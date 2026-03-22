import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiChat } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRiderApplication } from "@/lib/rider-applications";

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

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit({
    key: "riders-apply",
    limit: 5,
    windowMs: 60 * 60 * 1000,
    headers: req.headers,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many applications submitted. Please try again later." },
      { status: 429, headers: { "retry-after": String(rateLimit.retryAfterSec) } }
    );
  }

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

  const applicationId = randomUUID();

  await createRiderApplication({
    id: applicationId,
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    idNumberLast4: payload.idNumberLast4,
    licenseCode: payload.licenseCode,
    suburb: payload.suburb,
    city: payload.city,
    vehicleType: payload.vehicleType,
    vehicleRegistration: payload.vehicleRegistration || null,
    availableHours: payload.availableHours,
    emergencyContactName: payload.emergencyContactName,
    emergencyContactPhone: payload.emergencyContactPhone,
    hasSmartphone: payload.hasSmartphone,
    hasBankAccount: payload.hasBankAccount,
    experience: payload.experience || null,
    aiSummary: summary.slice(0, 1200),
  });

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
