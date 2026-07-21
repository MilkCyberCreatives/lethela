import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRequest } from "@/lib/admin-auth";
import {
  createPlatformMessage,
  listRecentPlatformMessages,
  notifyPlatformMessageRecipients,
} from "@/lib/platform-messages";

const MessageSchema = z.object({
  recipientType: z.enum(["VENDOR", "RIDER", "ALL_VENDORS", "ALL_RIDERS", "ALL"]),
  recipientId: z.string().trim().min(1).max(120).optional().nullable(),
  subject: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(2000),
  channel: z.enum(["DASHBOARD", "EMAIL_WHATSAPP", "ALL"]).optional().default("ALL"),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const take = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("take") || 50)));
  const items = await listRecentPlatformMessages(take);
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const parsed = MessageSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid message payload.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  if (
    (payload.recipientType === "VENDOR" || payload.recipientType === "RIDER") &&
    !payload.recipientId
  ) {
    return NextResponse.json(
      { ok: false, error: "Choose a vendor or rider recipient." },
      { status: 400 },
    );
  }

  const message = await createPlatformMessage({
    recipientType: payload.recipientType,
    recipientId:
      payload.recipientType === "VENDOR" || payload.recipientType === "RIDER"
        ? payload.recipientId
        : null,
    subject: payload.subject,
    body: payload.body,
    channel: payload.channel,
    createdBy: guard.actor,
  });

  const delivery =
    payload.channel === "DASHBOARD"
      ? { contacts: 0, emailEnabled: false, whatsappEnabled: false }
      : await notifyPlatformMessageRecipients({
          recipientType: payload.recipientType,
          recipientId: payload.recipientId,
          subject: payload.subject,
          body: payload.body,
        });

  return NextResponse.json({
    ok: true,
    message,
    delivery,
    notice:
      payload.channel === "DASHBOARD"
        ? "Message posted to dashboard inbox."
        : "Message posted and external notifications attempted where configured.",
  });
}
