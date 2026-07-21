import { pusherServer } from "@/lib/pusher-server";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import {
  escapeHtml,
  hasEmailChannel,
  hasWhatsAppChannel,
  sendResendEmail,
  sendTwilioWhatsApp,
  settleWithin,
  splitCsv,
} from "@/lib/notification-channels";
import { prisma } from "@/lib/db";
import { hasWebPushConfig } from "@/lib/web-push";
import { sendPushToAdmins } from "@/lib/push-notifications";

export type ApplicationKind = "vendor" | "rider";
export type ApplicationStatus = "submitted" | "under_review" | "approved" | "rejected";

export type ApplicantNotification = {
  kind: ApplicationKind;
  name: string;
  email: string;
  phone: string;
  status: ApplicationStatus;
  reference?: string | null;
};

export type AdminRiderApplicationNotification = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  suburb?: string | null;
  city?: string | null;
  vehicleType?: string | null;
};

function adminNotificationEmails() {
  return splitCsv(process.env.ADMIN_NOTIFICATION_EMAILS || process.env.NEXT_PUBLIC_SUPPORT_EMAIL);
}

function adminWhatsAppRecipients() {
  return splitCsv(process.env.ADMIN_NOTIFICATION_WHATSAPP_TO);
}

function roleLabel(kind: ApplicationKind) {
  return kind === "vendor" ? "vendor" : "rider";
}

function dashboardUrl(kind: ApplicationKind) {
  return kind === "vendor" ? absoluteUrl("/vendors/dashboard") : absoluteUrl("/rider/dashboard");
}

function statusTitle(status: ApplicationStatus) {
  if (status === "submitted") return "Application received";
  if (status === "under_review") return "Application under review";
  if (status === "approved") return "Application approved";
  return "Application update";
}

function applicantMessage(input: ApplicantNotification) {
  const role = roleLabel(input.kind);
  const actionUrl = dashboardUrl(input.kind);
  const reference = input.reference ? `\nReference: ${input.reference}` : "";

  if (input.status === "approved") {
    return {
      subject: `Your ${SITE_NAME} ${role} application is approved`,
      text: [
        `Hi ${input.name},`,
        "",
        `Your ${SITE_NAME} ${role} application has been approved.`,
        `You can now open your ${role} dashboard and complete your operating settings.`,
        reference,
        "",
        `Dashboard: ${actionUrl}`,
        "",
        `${SITE_NAME} team`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (input.status === "rejected") {
    return {
      subject: `Update on your ${SITE_NAME} ${role} application`,
      text: [
        `Hi ${input.name},`,
        "",
        `We have reviewed your ${SITE_NAME} ${role} application and it was not approved at this stage.`,
        "You can contact support if you believe anything should be updated or reviewed again.",
        reference,
        "",
        `${SITE_NAME} team`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (input.status === "under_review") {
    return {
      subject: `Your ${SITE_NAME} ${role} application is under review`,
      text: [
        `Hi ${input.name},`,
        "",
        `Your ${SITE_NAME} ${role} application is now being reviewed by our operations team.`,
        "We will send another email and WhatsApp when a final decision is made.",
        reference,
        "",
        `${SITE_NAME} team`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  return {
    subject: `We received your ${SITE_NAME} ${role} application`,
    text: [
      `Hi ${input.name},`,
      "",
      `Thank you for registering to become a ${role} on ${SITE_NAME}.`,
      "We received your application and our owner/admin team will review it.",
      "You will receive another email and WhatsApp once you are approved or if we need more information.",
      reference,
      "",
      `${SITE_NAME} team`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function applicantHtml(input: ApplicantNotification, text: string) {
  const paragraphs = text
    .split("\n")
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 12px">${escapeHtml(line)}</p>`)
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827">
      <h2 style="margin:0 0 16px">${escapeHtml(statusTitle(input.status))}</h2>
      ${paragraphs}
    </div>
  `;
}

export function getApplicantNotificationChannelStatus() {
  return {
    email: { enabled: hasEmailChannel() },
    whatsapp: { enabled: hasWhatsAppChannel() },
  };
}

export async function notifyApplicant(input: ApplicantNotification) {
  const channels = getApplicantNotificationChannelStatus();
  const message = applicantMessage(input);
  const tasks: Promise<unknown>[] = [];

  if (channels.email.enabled) {
    tasks.push(
      settleWithin(
        sendResendEmail({
          to: input.email,
          subject: message.subject,
          text: message.text,
          html: applicantHtml(input, message.text),
        }),
        3000,
      ),
    );
  }

  if (channels.whatsapp.enabled) {
    tasks.push(
      settleWithin(
        sendTwilioWhatsApp({
          to: input.phone,
          body: message.text,
        }),
        3000,
      ),
    );
  }

  await Promise.all(tasks);
  return channels;
}

function buildRiderAdminPlainText(
  application: AdminRiderApplicationNotification,
  pendingCount: number,
) {
  const location =
    [application.suburb, application.city].filter(Boolean).join(", ") || "Location not provided";
  return [
    `New rider application received on ${SITE_NAME}.`,
    "",
    `Applicant: ${application.fullName}`,
    `Email: ${application.email}`,
    `Phone: ${application.phone}`,
    `Vehicle: ${application.vehicleType || "Not provided"}`,
    `Location: ${location}`,
    `Pending rider applications: ${pendingCount}`,
    "",
    `Review now: ${absoluteUrl("/admin")}`,
  ].join("\n");
}

function buildRiderAdminHtml(application: AdminRiderApplicationNotification, pendingCount: number) {
  const location =
    [application.suburb, application.city].filter(Boolean).join(", ") || "Location not provided";
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h2 style="margin:0 0 12px">New rider application received</h2>
      <p style="margin:0 0 16px">A rider has applied on ${escapeHtml(SITE_NAME)}. Review it from the owner dashboard.</p>
      <ul style="padding-left:20px;margin:0 0 16px">
        <li><strong>Applicant:</strong> ${escapeHtml(application.fullName)}</li>
        <li><strong>Email:</strong> ${escapeHtml(application.email)}</li>
        <li><strong>Phone:</strong> ${escapeHtml(application.phone)}</li>
        <li><strong>Vehicle:</strong> ${escapeHtml(application.vehicleType || "Not provided")}</li>
        <li><strong>Location:</strong> ${escapeHtml(location)}</li>
        <li><strong>Pending rider applications:</strong> ${pendingCount}</li>
      </ul>
      <p style="margin:0"><a href="${absoluteUrl("/admin")}" style="color:#B5001B">Open owner dashboard</a></p>
    </div>
  `;
}

export async function notifyAdminsOfRiderApplication(
  application: AdminRiderApplicationNotification,
) {
  const pendingCount = await prisma.riderApplication.count({
    where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
  });
  const emailRecipients = adminNotificationEmails();
  const whatsAppRecipients = adminWhatsAppRecipients();
  const tasks: Promise<unknown>[] = [];

  if (
    process.env.PUSHER_APP_ID?.trim() &&
    process.env.PUSHER_KEY?.trim() &&
    process.env.PUSHER_SECRET?.trim() &&
    process.env.NEXT_PUBLIC_PUSHER_KEY?.trim()
  ) {
    tasks.push(
      settleWithin(
        pusherServer.trigger("admin-notifications", "rider-application", {
          type: "rider-application",
          title: "New rider application",
          body: `${application.fullName} is waiting for owner approval.`,
          href: "/admin",
          pendingCount,
          at: new Date().toISOString(),
        }),
        1500,
      ),
    );
  }

  if (hasWebPushConfig()) {
    tasks.push(
      settleWithin(
        sendPushToAdmins({
          title: "New rider application",
          body: `${application.fullName} is waiting for owner approval.`,
          url: "/admin",
          tag: "lethela-admin-rider-application",
        }),
        3000,
      ),
    );
  }

  if (hasEmailChannel() && emailRecipients.length > 0) {
    tasks.push(
      settleWithin(
        sendResendEmail({
          to: emailRecipients,
          subject: `New rider application: ${application.fullName}`,
          text: buildRiderAdminPlainText(application, pendingCount),
          html: buildRiderAdminHtml(application, pendingCount),
        }),
        3000,
      ),
    );
  }

  if (hasWhatsAppChannel() && whatsAppRecipients.length > 0) {
    tasks.push(
      settleWithin(
        sendTwilioWhatsApp({
          to: whatsAppRecipients,
          body: buildRiderAdminPlainText(application, pendingCount),
        }),
        3000,
      ),
    );
  }

  await Promise.all(tasks);
  return { pendingCount };
}
