export type EmailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  from?: string;
};

export type WhatsAppMessage = {
  to: string | string[];
  body: string;
};

export function settleWithin(task: Promise<unknown>, timeoutMs: number) {
  return Promise.race([
    task.catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

export function splitCsv(value?: string | null) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function normalizeWhatsAppRecipient(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.toLowerCase().startsWith("whatsapp:")) return raw;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return "";
  return `whatsapp:${digits.startsWith("+") ? digits : `+${digits}`}`;
}

export function normalizeWhatsAppSender(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.toLowerCase().startsWith("whatsapp:") ? raw : `whatsapp:${raw}`;
}

export function notificationEmailFrom() {
  return (
    process.env.ADMIN_NOTIFICATION_EMAIL_FROM?.trim() ||
    process.env.PASSWORD_RESET_EMAIL_FROM?.trim() ||
    ""
  );
}

export function hasEmailChannel() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && notificationEmailFrom());
}

export function hasWhatsAppChannel() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      normalizeWhatsAppSender(process.env.TWILIO_WHATSAPP_FROM),
  );
}

export async function sendResendEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = message.from?.trim() || notificationEmailFrom();
  const to = Array.isArray(message.to)
    ? message.to.map((item) => item.trim()).filter(Boolean)
    : message.to.trim();

  if (!apiKey || !from || (Array.isArray(to) && to.length === 0) || (!Array.isArray(to) && !to)) {
    return { delivered: false as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Failed to send email notification.");
  }

  return {
    delivered: true as const,
    recipients: Array.isArray(to) ? to.length : 1,
  };
}

export async function sendTwilioWhatsApp(message: WhatsAppMessage) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = normalizeWhatsAppSender(process.env.TWILIO_WHATSAPP_FROM);
  const recipients = (Array.isArray(message.to) ? message.to : [message.to])
    .map(normalizeWhatsAppRecipient)
    .filter(Boolean);

  if (!accountSid || !authToken || !from || recipients.length === 0) {
    return { delivered: false as const };
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  await Promise.all(
    recipients.map(async (to) => {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: to,
            From: from,
            Body: message.body,
          }).toString(),
        },
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Failed to send WhatsApp notification.");
      }
    }),
  );

  return { delivered: true as const, recipients: recipients.length };
}
