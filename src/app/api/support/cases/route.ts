import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  escapeHtml,
  sendResendEmail,
  settleWithin,
  splitCsv,
} from "@/lib/notification-channels";

const BodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(40),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  issueType: z.enum([
    "ACTIVE_ORDER",
    "PAYMENT",
    "REFUND",
    "ACCOUNT",
    "VENDOR",
    "RIDER",
    "OTHER",
  ]),
  orderRef: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().min(10).max(2000),
  evidenceUrl: z.string().trim().url().max(1000).optional().or(z.literal("")),
  preferredContact: z.enum(["WHATSAPP", "PHONE", "EMAIL"]),
});

function caseReference() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `SUP-${date}-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit({
    key: "public-support-case",
    limit: 6,
    windowMs: 60 * 60 * 1000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many support requests. Please try again later." },
      { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } },
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the support form and try again." },
      { status: 400 },
    );
  }

  const caseId = caseReference();
  const details = {
    caseId,
    ...parsed.data,
    submittedAt: new Date().toISOString(),
  };

  await prisma.platformMessage.create({
    data: {
      id: randomUUID(),
      recipientType: "SUPPORT_CASE",
      recipientId: parsed.data.phone,
      subject: `[${caseId}] ${parsed.data.issueType.replaceAll("_", " ")}`,
      body: JSON.stringify(details),
      channel: "SUPPORT",
      status: "OPEN",
      createdBy: "PUBLIC_CONTACT_FORM",
    },
  });

  const recipients = splitCsv(
    process.env.SUPPORT_EMAIL_TO ||
      process.env.ADMIN_NOTIFICATION_EMAILS ||
      process.env.ADMIN_NOTIFICATION_EMAIL_TO ||
      process.env.ADMIN_NOTIFICATION_EMAIL,
  );
  if (recipients.length > 0) {
    const text = [
      `Support case: ${caseId}`,
      `Type: ${parsed.data.issueType}`,
      `Name: ${parsed.data.name}`,
      `Phone: ${parsed.data.phone}`,
      `Email: ${parsed.data.email || "Not provided"}`,
      `Order: ${parsed.data.orderRef || "Not provided"}`,
      `Preferred contact: ${parsed.data.preferredContact}`,
      `Evidence: ${parsed.data.evidenceUrl || "Not provided"}`,
      "",
      parsed.data.description,
    ].join("\n");
    const html = `<h2>Support case ${escapeHtml(caseId)}</h2><p><strong>Type:</strong> ${escapeHtml(parsed.data.issueType)}</p><p><strong>Name:</strong> ${escapeHtml(parsed.data.name)}</p><p><strong>Phone:</strong> ${escapeHtml(parsed.data.phone)}</p><p><strong>Email:</strong> ${escapeHtml(parsed.data.email || "Not provided")}</p><p><strong>Order:</strong> ${escapeHtml(parsed.data.orderRef || "Not provided")}</p><p><strong>Preferred contact:</strong> ${escapeHtml(parsed.data.preferredContact)}</p><p><strong>Evidence:</strong> ${escapeHtml(parsed.data.evidenceUrl || "Not provided")}</p><p>${escapeHtml(parsed.data.description).replaceAll("\n", "<br />")}</p>`;
    await settleWithin(
      sendResendEmail({
        to: recipients,
        subject: `[${caseId}] Lethela support request`,
        text,
        html,
      }),
      4_000,
    );
  }

  return NextResponse.json({ ok: true, caseId });
}
