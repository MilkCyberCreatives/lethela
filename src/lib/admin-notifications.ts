import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { pusherServer } from "@/lib/pusher-server";
import { prisma } from "@/lib/db";
import {
  escapeHtml,
  hasEmailChannel,
  hasWhatsAppChannel,
  normalizeWhatsAppRecipient,
  sendResendEmail,
  sendTwilioWhatsApp,
  settleWithin,
  splitCsv,
} from "@/lib/notification-channels";
import { hasWebPushConfig } from "@/lib/web-push";
import { sendPushToAdmins } from "@/lib/push-notifications";

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

function adminNotificationEmails() {
  return splitCsv(process.env.ADMIN_NOTIFICATION_EMAILS || process.env.NEXT_PUBLIC_SUPPORT_EMAIL);
}

function adminWhatsAppRecipients() {
  return splitCsv(process.env.ADMIN_NOTIFICATION_WHATSAPP_TO)
    .map(normalizeWhatsAppRecipient)
    .filter(Boolean);
}

function notificationsBaseUrl() {
  return absoluteUrl("/admin");
}

function buildPlainTextMessage(
  application: AdminVendorApplicationNotification,
  pendingCount: number,
) {
  const location =
    [application.suburb, application.city].filter(Boolean).join(", ") || "Location not provided";
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
  const location =
    [application.suburb, application.city].filter(Boolean).join(", ") || "Location not provided";
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h2 style="margin:0 0 12px">New vendor application received</h2>
      <p style="margin:0 0 16px">A vendor has applied on ${escapeHtml(SITE_NAME)}. You can review it from the admin approvals page.</p>
      <ul style="padding-left:20px;margin:0 0 16px">
        <li><strong>Business:</strong> ${escapeHtml(application.name)}</li>
        <li><strong>Slug:</strong> /${escapeHtml(application.slug)}</li>
        <li><strong>Email:</strong> ${escapeHtml(application.email || "Not provided")}</li>
        <li><strong>Phone:</strong> ${escapeHtml(application.phone || "Not provided")}</li>
        <li><strong>Location:</strong> ${escapeHtml(location)}</li>
        <li><strong>Pending applications:</strong> ${pendingCount}</li>
      </ul>
      <p style="margin:0"><a href="${notificationsBaseUrl()}" style="color:#B5001B">Open admin approvals</a></p>
    </div>
  `;
}

async function sendResendEmailNotification(
  application: AdminVendorApplicationNotification,
  pendingCount: number,
) {
  const to = adminNotificationEmails();

  if (to.length === 0) return { delivered: false as const };

  return sendResendEmail({
    to,
    subject: `New vendor application: ${application.name}`,
    text: buildPlainTextMessage(application, pendingCount),
    html: buildHtmlMessage(application, pendingCount),
  });
}

async function sendTwilioWhatsAppNotification(
  application: AdminVendorApplicationNotification,
  pendingCount: number,
) {
  const recipients = adminWhatsAppRecipients();

  if (recipients.length === 0) return { delivered: false as const };

  return sendTwilioWhatsApp({
    to: recipients,
    body: buildPlainTextMessage(application, pendingCount),
  });
}

export function getAdminNotificationChannelStatus() {
  return {
    email: {
      enabled: Boolean(hasEmailChannel() && adminNotificationEmails().length > 0),
      recipients: adminNotificationEmails().length,
    },
    whatsapp: {
      enabled: Boolean(hasWhatsAppChannel() && adminWhatsAppRecipients().length > 0),
      recipients: adminWhatsAppRecipients().length,
    },
    push: {
      enabled: Boolean(
        process.env.PUSHER_APP_ID?.trim() &&
          process.env.PUSHER_KEY?.trim() &&
          process.env.PUSHER_SECRET?.trim() &&
          process.env.NEXT_PUBLIC_PUSHER_KEY?.trim(),
      ),
    },
    webPush: {
      enabled: hasWebPushConfig(),
    },
  };
}

export async function notifyAdminsOfVendorApplication(
  application: AdminVendorApplicationNotification,
) {
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
        1500,
      ),
    );
  }

  if (channels.webPush.enabled) {
    tasks.push(
      settleWithin(
        sendPushToAdmins({
          title: "New vendor application",
          body: `${application.name} is waiting for admin approval.`,
          url: "/admin",
          tag: "lethela-admin-vendor-application",
        }),
        3000,
      ),
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
