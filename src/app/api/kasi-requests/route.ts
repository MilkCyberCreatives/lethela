import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { KASI_REQUEST_ROLE_LABELS } from "@/lib/kasi-requests";
import { notifyStaff } from "@/lib/notifications";
import { escapeHtml, sendResendEmail, settleWithin, splitCsv } from "@/lib/notification-channels";

// "Bring Lethela to my kasi": people outside the pilot area say which township they live in
// and whether they want to order, sell or deliver, so Lethela knows where to open next.
const BodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .min(8)
    .max(40)
    .regex(/^[+\d][\d\s()-]+$/),
  township: z.string().trim().min(2).max(80),
  role: z.enum(["CUSTOMER", "STORE", "RIDER"]),
  // Hidden field that people never fill in; bots that fill every box are ignored.
  website: z.string().max(200).optional().default(""),
});

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit({
    key: "public-kasi-request",
    limit: 5,
    windowMs: 60 * 60 * 1000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } },
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please add your name, phone number and township." },
      { status: 400 },
    );
  }
  if (parsed.data.website) return NextResponse.json({ ok: true });

  const { name, phone, township, role } = parsed.data;
  const roleLabel = KASI_REQUEST_ROLE_LABELS[role];
  const details = { name, phone, township, role, submittedAt: new Date().toISOString() };

  await prisma.platformMessage.create({
    data: {
      id: randomUUID(),
      recipientType: "KASI_REQUEST",
      recipientId: township.toLowerCase(),
      subject: `${township}: ${roleLabel}`,
      body: JSON.stringify(details),
      channel: "PUBLIC_FORM",
      status: "OPEN",
      createdBy: "PUBLIC_KASI_FORM",
    },
  });

  await settleWithin(
    notifyStaff({
      type: "kasi_request",
      title: `Lethela wanted in ${township}`,
      body: `${name} wants to ${roleLabel.toLowerCase()}. Phone ${phone}.`,
      href: "/admin?view=messages",
    }).catch(() => null),
    3_000,
  );

  const recipients = splitCsv(
    process.env.ADMIN_NOTIFICATION_EMAILS ||
      process.env.SUPPORT_EMAIL_TO ||
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  );
  if (recipients.length > 0) {
    await settleWithin(
      sendResendEmail({
        to: recipients,
        subject: `Lethela wanted in ${township}`,
        text: [
          `Township: ${township}`,
          `Wants to: ${roleLabel}`,
          `Name: ${name}`,
          `Phone: ${phone}`,
        ].join("\n"),
        html: `<h2>Lethela wanted in ${escapeHtml(township)}</h2><p><strong>Wants to:</strong> ${escapeHtml(roleLabel)}</p><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Phone:</strong> ${escapeHtml(phone)}</p>`,
      }).catch(() => null),
      4_000,
    );
  }

  return NextResponse.json({ ok: true });
}
