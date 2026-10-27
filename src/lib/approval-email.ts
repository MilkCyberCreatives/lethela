import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { EMAIL_LOGO_PNG_BASE64 } from "@/lib/email-logo";
import { escapeHtml, type EmailAttachment } from "@/lib/notification-channels";
import { buildWhatsAppSupportLink } from "@/lib/support";

// Lethela's branded "you're approved" email for stores, riders and buyers. Built with tables
// and inline styles so it looks the same in Gmail, Outlook and phone mail apps.
const RED = "#B5001B";
const NAVY = "#080B27";
const INK = "#1F2937";

const LOGO_CONTENT_ID = "lethela-logo";

/** Lethela's approved logo (public/email/lethela-logo.png) as an inline email image. */
export function approvalEmailLogo(): EmailAttachment {
  return {
    filename: "lethela-logo.png",
    content: EMAIL_LOGO_PNG_BASE64,
    content_id: LOGO_CONTENT_ID,
  };
}

export type ApprovalAudience = "vendor" | "rider" | "buyer";

export type ApprovalEmailInput = {
  audience: ApprovalAudience;
  name?: string | null;
  storeName?: string | null;
  /** What is still missing before the store or rider can take orders. Empty means ready. */
  missing?: string[];
  /** "reminder" nudges an unfinished store or rider instead of announcing an approval. */
  kind?: "approved" | "reminder";
};

type ApprovalContent = {
  badge: string;
  subject: string;
  preheader: string;
  heading: string;
  intro: string;
  stepsTitle: string;
  steps: string[];
  buttonLabel: string;
  buttonUrl: string;
};

function firstName(name?: string | null) {
  const clean = String(name || "").trim();
  return clean ? clean.split(/\s+/)[0] : "there";
}

export function approvalContent(input: ApprovalEmailInput): ApprovalContent {
  const missing = (input.missing || []).filter(Boolean);
  const ready = missing.length === 0;
  const store = String(input.storeName || "").trim();
  const storeLabel = store && store.toLowerCase() !== "new vendor" ? store : "Your store";

  if (input.kind === "reminder" && !ready && input.audience !== "buyer") {
    const left = missing.length === 1 ? "1 step" : `${missing.length} steps`;
    const heading = missing.length === 1 ? "One step to go" : `${missing.length} steps to go`;
    return input.audience === "vendor"
      ? {
          badge: "Almost there",
          subject: `${storeLabel} is ${left} away from taking orders`,
          preheader: "Finish these details and your store goes live on its own.",
          heading,
          intro: `${storeLabel} goes live on ${SITE_NAME} on its own as soon as the details below are in, and customers can then order and pay online. It takes a few minutes on your phone.`,
          stepsTitle: "Still needed before customers can order",
          steps: missing,
          buttonLabel: "Finish my store",
          buttonUrl: absoluteUrl("/vendors/dashboard"),
        }
      : {
          badge: "Almost there",
          subject: `You are ${left} away from delivering with ${SITE_NAME}`,
          preheader: "Finish these details, go online and start getting delivery requests.",
          heading,
          intro: `Add the details below, then tap Go online and ${SITE_NAME} delivery requests come to your phone. The delivery fee and any tip are yours.`,
          stepsTitle: "Still needed before you can deliver",
          steps: missing,
          buttonLabel: "Finish my profile",
          buttonUrl: absoluteUrl("/rider/dashboard"),
        };
  }

  if (input.audience === "vendor") {
    return ready
      ? {
          badge: "Approved",
          subject: `${storeLabel} is approved on ${SITE_NAME}`,
          preheader: "Your store is live. Customers nearby can order from you now.",
          heading: "Your store is approved",
          intro: `${storeLabel} is approved and live on ${SITE_NAME}. Customers nearby can now find your store and order from you.`,
          stepsTitle: "How orders work",
          steps: [
            "New orders arrive on WhatsApp and on your store dashboard. Keep your phone close.",
            "Accept the order, prepare it and tap Ready when it is packed.",
            `A ${SITE_NAME} rider collects it and delivers it to the customer.`,
          ],
          buttonLabel: "Open my store dashboard",
          buttonUrl: absoluteUrl("/vendors/dashboard"),
        }
      : {
          badge: "Approved",
          subject: `Your ${SITE_NAME} store account is approved`,
          preheader: "Add the last details and your store goes live straight away.",
          heading: "Your store account is approved",
          intro: `Your ${SITE_NAME} store account is approved. Add the details below and your store goes live straight away, with no waiting.`,
          stepsTitle: "Still needed before customers can order",
          steps: missing,
          buttonLabel: "Finish my store",
          buttonUrl: absoluteUrl("/vendors/dashboard"),
        };
  }

  if (input.audience === "rider") {
    return ready
      ? {
          badge: "Approved",
          subject: `You are approved to deliver with ${SITE_NAME}`,
          preheader: "Go online to start getting delivery requests near you.",
          heading: "You are approved to deliver",
          intro: `You are approved as a ${SITE_NAME} rider. Go online and you will start getting delivery requests near you.`,
          stepsTitle: "How deliveries work",
          steps: [
            "Open your rider dashboard and tap Go online.",
            "Delivery requests arrive on WhatsApp and on your dashboard. The first rider to accept gets the delivery.",
            "The delivery fee and any tip are yours.",
          ],
          buttonLabel: "Open my rider dashboard",
          buttonUrl: absoluteUrl("/rider/dashboard"),
        }
      : {
          badge: "Approved",
          subject: `Your ${SITE_NAME} rider account is approved`,
          preheader: "Add the last details, then go online to start delivering.",
          heading: "Your rider account is approved",
          intro: `Your ${SITE_NAME} rider account is approved. Add the details below, then tap Go online to start getting delivery requests.`,
          stepsTitle: "Still needed before you can deliver",
          steps: missing,
          buttonLabel: "Finish my profile",
          buttonUrl: absoluteUrl("/rider/dashboard"),
        };
  }

  return {
    badge: "Approved",
    subject: `Your ${SITE_NAME} account is approved`,
    preheader: "Order from local stores and spaza shops near you.",
    heading: "Your account is approved",
    intro: `Your ${SITE_NAME} account is approved and ready. Order food and groceries from local stores and spaza shops, delivered to your door.`,
    stepsTitle: "Ordering is simple",
    steps: [
      "Choose a store near you and add what you want.",
      "Pay securely online when you order. No cash needed at the door.",
      "Follow your order until the rider is at your door.",
    ],
    buttonLabel: "Start ordering",
    buttonUrl: absoluteUrl("/"),
  };
}

export function buildApprovalEmail(input: ApprovalEmailInput) {
  const content = approvalContent(input);
  const greeting = `Hi ${firstName(input.name)},`;
  const supportUrl = buildWhatsAppSupportLink(`Hello ${SITE_NAME}, I need help with my account.`);
  // The approved logo travels inside the email (an inline image), so it shows even where the
  // mail app blocks pictures from websites.
  const logoUrl = `cid:${LOGO_CONTENT_ID}`;
  const siteUrl = absoluteUrl("/");

  const text = [
    greeting,
    "",
    content.intro,
    "",
    `${content.stepsTitle}:`,
    ...content.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    `${content.buttonLabel}: ${content.buttonUrl}`,
    "",
    `Need help? WhatsApp us: ${supportUrl}`,
    "",
    `The ${SITE_NAME} team`,
  ].join("\n");

  const steps = content.steps
    .map(
      (step, index) => `
              <tr>
                <td valign="top" width="36" style="padding:0 0 14px 0">
                  <div style="width:26px;height:26px;line-height:26px;border-radius:13px;background:${RED};color:#ffffff;font-size:13px;font-weight:bold;text-align:center">${index + 1}</div>
                </td>
                <td valign="top" style="padding:3px 0 14px 0;font-size:15px;line-height:22px;color:${INK}">${escapeHtml(step)}</td>
              </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(content.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6">
    <tr>
      <td align="center" style="padding:24px 12px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB">
          <tr>
            <td align="center" style="padding:28px 24px 22px 24px;background:#ffffff">
              <a href="${siteUrl}" style="text-decoration:none"><img src="${logoUrl}" width="180" alt="${SITE_NAME}" style="display:block;width:180px;max-width:60%;height:auto;border:0"></a>
            </td>
          </tr>
          <tr><td style="height:6px;line-height:6px;font-size:0;background:${RED}">&nbsp;</td></tr>
          <tr>
            <td style="padding:32px 32px 8px 32px">
              <div style="display:inline-block;padding:5px 12px;border-radius:999px;background:#FDECEE;color:${RED};font-size:12px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase">${escapeHtml(content.badge)}</div>
              <h1 style="margin:16px 0 0 0;font-size:26px;line-height:32px;color:${NAVY};font-weight:bold">${escapeHtml(content.heading)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px;font-size:16px;line-height:24px;color:${INK}">
              <p style="margin:0 0 12px 0">${escapeHtml(greeting)}</p>
              <p style="margin:0">${escapeHtml(content.intro)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0 32px">
              <div style="font-size:13px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase;color:${NAVY};margin:0 0 14px 0">${escapeHtml(content.stepsTitle)}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${steps}
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:12px 32px 32px 32px">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius:8px;background:${RED}">
                    <a href="${content.buttonUrl}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px">${escapeHtml(content.buttonLabel)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px;background:${NAVY};color:#ffffff;font-size:14px;line-height:21px">
              <p style="margin:0 0 6px 0;font-weight:bold">Need help?</p>
              <p style="margin:0 0 14px 0;color:#D1D5DB">WhatsApp the ${SITE_NAME} team and we will help you. <a href="${supportUrl}" style="color:#FF4D5E;font-weight:bold;text-decoration:none">Chat on WhatsApp</a></p>
              <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:18px">You are getting this email because you have a ${SITE_NAME} account. <a href="${siteUrl}" style="color:#9CA3AF">lethela.co.za</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const whatsapp = [
    `${SITE_NAME}: ${content.heading}`,
    "",
    greeting,
    content.intro,
    "",
    ...(input.kind === "reminder" ? content.steps.map((step) => `- ${step}`).concat("") : []),
    `${content.buttonLabel}: ${content.buttonUrl}`,
  ].join("\n");

  return { subject: content.subject, text, html, whatsapp, attachments: [approvalEmailLogo()] };
}
