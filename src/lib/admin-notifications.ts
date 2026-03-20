import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { pusherServer } from "@/lib/pusher-server";
import { prisma } from "@/lib/db";

export type AdminVendorApplicationNotification = {
  id: string;
  name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  suburb?: string | null;
  city?: string | null;
  createdAt?: Date | string | null;
};

function settleWithin(task: Promise<unknown>, timeoutMs: number) {
  return Promise.race([
    task.catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

function splitCsv(value?: string | null) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeWhatsAppRecipient(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.toLowerCase().startsWith("whatsapp:")) return raw;
  const digits = raw.replace(/[^\d+]/g, "");
  return `whatsapp:${digits.startsWith("+") ? digits : `+${digits}`}`;
}

function normalizeWhatsAppSender(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.toLowerCase().startsWith("whatsapp:") ? raw : `whatsapp:${raw}`;
}

function adminNotificationEmails() {
  return splitCsv(process.env.ADMIN_NOTIFICATION_EMAILS || process.env.NEXT_PUBLIC_SUPPORT_EMAIL);
}

function adminWhatsAppRecipients() {
  return splitCsv(process.env.ADMIN_NOTIFICATION_WHATSAPP_TO).map(normalizeWhatsAppRecipient).filter(Boolean);
}

function notificationsBaseUrl() {
  return absoluteUrl("/admin");
}

function buildPlainTextMessage(application: AdminVendorApplicationNotification, pendingCount: number) {
  const location = [application.suburb, application.city].filter(Boolean).join(", ") || "Location not provided";
  return [
    `New vendor application received on ${SITE_NAME}.`,
    "",
    `Business: ${application.name}`,
    `Slug: /${application.slug}`,
    `Email: ${application.email || "Not provided"}`,
    `Phone: ${application.phone || "Not provided"}`,
    `Location: ${location}`,
    `Pending applications: ${pendingCount}`,
    "",
    `Review now: ${notificationsBaseUrl()}`,
  ].join("\n");
}

function buildHtmlMessage(application: AdminVendorApplicationNotification, pendingCount: number) {
  const location = [application.suburb, application.city].filter(Boolean).join(", ") || "Location not provided";
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h2 style="margin:0 0 12px">New vendor application received</h2>
      <p style="margin:0 0 16px">A vendor has applied on ${SITE_NAME}. You can review it from the admin approvals page.</p>
      <ul style="padding-left:20px;margin:0 0 16px">
        <li><strong>Business:</strong> ${application.name}</li>
        <li><strong>Slug:</strong> /${application.slug}</li>
        <li><strong>Email:</strong> ${application.email || "Not provided"}</li>
        <li><strong>Phone:</strong> ${application.phone || "Not provided"}</li>
        <li><strong>Location:</strong> ${location}</li>
        <li><strong>Pending applications:</strong> ${pendingCount}</li>
      </ul>
      <p style="margin:0"><a href="${notificationsBaseUrl()}" style="color:#B5001B">Open admin approvals</a></p>
    </div>
  `;
}

async function sendResendEmailNotification(
  application: AdminVendorApplicationNotification,
  pendingCount: number
) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ADMIN_NOTIFICATION_EMAIL_FROM?.trim();
  const to = adminNotificationEmails();

  if (!apiKey || !from || to.length === 0) return { delivered: false as const };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `New vendor application: ${application.name}`,
      text: buildPlainTextMessage(application, pendingCount),
      html: buildHtmlMessage(application, pendingCount),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Failed to send admin email notification.");
  }

  return { delivered: true as const, recipients: to.length };
}

async function sendTwilioWhatsAppNotification(
  application: AdminVendorApplicationNotification,
  pendingCount: number
) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = normalizeWhatsAppSender(process.env.TWILIO_WHATSAPP_FROM);
  const recipients = adminWhatsAppRecipients();

  if (!accountSid || !authToken || !from || recipients.length === 0) {
    return { delivered: false as const };
  }

  const body = buildPlainTextMessage(application, pendingCount);
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  await Promise.all(
    recipients.map(async (to) => {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: from,
          Body: body,
        }).toString(),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Failed to send admin WhatsApp notification.");
      }
    })
  );

  return { delivered: true as const, recipients: recipients.length };
}

export function getAdminNotificationChannelStatus() {
  return {
    email: {
      enabled: Boolean(process.env.RESEND_API_KEY?.trim() && process.env.ADMIN_NOTIFICATION_EMAIL_FROM?.trim() && adminNotificationEmails().length > 0),
      recipients: adminNotificationEmails().length,
    },
    whatsapp: {
      enabled: Boolean(
        process.env.TWILIO_ACCOUNT_SID?.trim() &&
          process.env.TWILIO_AUTH_TOKEN?.trim() &&
          normalizeWhatsAppSender(process.env.TWILIO_WHATSAPP_FROM) &&
          adminWhatsAppRecipients().length > 0
      ),
      recipients: adminWhatsAppRecipients().length,
    },
    push: {
      enabled: Boolean(
        process.env.PUSHER_APP_ID?.trim() &&
          process.env.PUSHER_KEY?.trim() &&
          process.env.PUSHER_SECRET?.trim() &&
          process.env.NEXT_PUBLIC_PUSHER_KEY?.trim()
      ),
    },
  };
}

export async function notifyAdminsOfVendorApplication(application: AdminVendorApplicationNotification) {
  const pendingCount = await prisma.vendor.count({ where: { status: "PENDING" } });
  const channels = getAdminNotificationChannelStatus();
  const tasks: Promise<unknown>[] = [];

  if (channels.push.enabled) {
    tasks.push(
      settleWithin(
        pusherServer.trigger("admin-notifications", "vendor-application", {
          type: "vendor-application",
          title: "New vendor application",
          body: `${application.name} is waiting for admin approval.`,
          href: "/admin",
          pendingCount,
          at: new Date().toISOString(),
        }),
        1500
      )
    );
  }

  if (channels.email.enabled) {
    tasks.push(settleWithin(sendResendEmailNotification(application, pendingCount), 3000));
  }

  if (channels.whatsapp.enabled) {
    tasks.push(settleWithin(sendTwilioWhatsAppNotification(application, pendingCount), 3000));
  }

  await Promise.all(tasks);

  return {
    pendingCount,
    channels,
  };
}
