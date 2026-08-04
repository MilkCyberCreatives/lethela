import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  escapeHtml,
  hasEmailChannel,
  sendResendEmail,
  settleWithin,
} from "@/lib/notification-channels";
import { absoluteUrl } from "@/lib/site";

type ReminderStage = "1D" | "3D" | "7D";

function authorised(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  return Boolean(cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`);
}

function reminderStage(createdAt: Date): ReminderStage | null {
  const ageHours = (Date.now() - createdAt.getTime()) / (60 * 60 * 1000);
  if (ageHours >= 20 && ageHours < 44) return "1D";
  if (ageHours >= 60 && ageHours < 84) return "3D";
  if (ageHours >= 156 && ageHours < 180) return "7D";
  return null;
}

async function sendReminder({
  recipientType,
  recipientId,
  email,
  stage,
  subject,
  body,
  setupUrl,
}: {
  recipientType: "VENDOR" | "RIDER";
  recipientId: string;
  email: string;
  stage: ReminderStage;
  subject: string;
  body: string;
  setupUrl: string;
}) {
  const reminderSubject = `[ONBOARDING_${stage}] ${subject}`;
  const existing = await prisma.platformMessage.findFirst({
    where: { recipientType, recipientId, subject: reminderSubject },
    select: { id: true },
  });
  if (existing) return false;

  await prisma.platformMessage.create({
    data: {
      id: randomUUID(),
      recipientType,
      recipientId,
      subject: reminderSubject,
      body,
      channel: hasEmailChannel() ? "DASHBOARD_EMAIL" : "DASHBOARD",
      status: "OPEN",
      createdBy: "ONBOARDING_REMINDER_CRON",
    },
  });

  if (hasEmailChannel()) {
    const url = absoluteUrl(setupUrl);
    await settleWithin(
      sendResendEmail({
        to: email,
        subject,
        text: `${body}\n\nContinue your Lethela setup: ${url}`,
        html: `<h2>${escapeHtml(subject)}</h2><p>${escapeHtml(body)}</p><p><a href="${escapeHtml(url)}">Continue your Lethela setup</a></p><p>You will not receive more than the limited 1-day, 3-day and 7-day onboarding reminders.</p>`,
      }),
      4_000,
    );
  }

  return true;
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  const [vendors, riders] = await Promise.all([
    prisma.vendor.findMany({
      where: {
        status: { in: ["DRAFT", "CHANGES_REQUESTED"] },
        createdAt: { gte: eightDaysAgo },
        owner: { email: { not: "" } },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        owner: { select: { email: true } },
      },
      take: 200,
    }),
    prisma.riderApplication.findMany({
      where: {
        status: { in: ["DRAFT", "CHANGES_REQUESTED"] },
        createdAt: { gte: eightDaysAgo },
        email: { not: "" },
      },
      select: { id: true, fullName: true, email: true, createdAt: true },
      take: 200,
    }),
  ]);

  let sent = 0;
  for (const vendor of vendors) {
    const stage = reminderStage(vendor.createdAt);
    const email = vendor.owner?.email?.trim();
    if (!stage || !email) continue;
    const created = await sendReminder({
      recipientType: "VENDOR",
      recipientId: vendor.id,
      email,
      stage,
      subject: "Complete your Lethela vendor profile",
      body: `${vendor.name || "Your store"} is still private. Add the required store, location, operating hours, products, banking and document details before submitting it for approval.`,
      setupUrl: "/vendors/dashboard?tab=profile",
    });
    if (created) sent += 1;
  }

  for (const rider of riders) {
    const stage = reminderStage(rider.createdAt);
    const email = rider.email.trim();
    if (!stage || !email) continue;
    const created = await sendReminder({
      recipientType: "RIDER",
      recipientId: rider.id,
      email,
      stage,
      subject: "Complete your Lethela rider profile",
      body: `${rider.fullName || "Your rider profile"} is still incomplete. Add the required personal, vehicle, availability, banking and document details before submitting it for verification.`,
      setupUrl: "/rider/dashboard/profile",
    });
    if (created) sent += 1;
  }

  return NextResponse.json({
    ok: true,
    sent,
    checked: vendors.length + riders.length,
    emailEnabled: hasEmailChannel(),
  });
}
