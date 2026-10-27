import { prisma } from "@/lib/db";
import { buildApprovalEmail, type ApprovalEmailInput } from "@/lib/approval-email";
import { isGuestEmail } from "@/lib/guest-customers";
import {
  hasEmailChannel,
  hasWhatsAppChannel,
  sendResendEmail,
  sendTwilioWhatsApp,
} from "@/lib/notification-channels";
import { claimOrderNotification, releaseOrderNotification } from "@/lib/order-notifications";
import { getRiderReadiness } from "@/lib/rider-readiness";
import { getVendorReadiness } from "@/lib/vendor-readiness";

// Gauta (18 Oct 2026): tell every store, rider and buyer that their account is approved, in a
// branded Lethela email. Runs from the order sweep cron in small batches until everyone who had
// an account at the time of the ask has had it once. People who join later get the normal
// approval message instead. Set APPROVAL_BROADCAST_ENABLED=false to stop it.
export const APPROVAL_BROADCAST_ID = "broadcast:approved-2026-10-18";
const ACCOUNTS_CREATED_BEFORE = new Date("2026-10-18T09:30:00Z");
const BROADCAST_ENDS_AT = new Date("2026-10-26T00:00:00Z");
const MAX_SENDS_PER_RUN = 20;
// Stay well inside the cron request's time limit.
const MAX_RUN_MS = 35_000;
// Resend allows about two emails a second.
const GAP_BETWEEN_SENDS_MS = 600;

export type BroadcastRecipient = ApprovalEmailInput & {
  email: string;
  phone?: string | null;
};

export function isBroadcastableEmail(email: string | null | undefined) {
  const clean = String(email || "")
    .trim()
    .toLowerCase();
  if (!clean.includes("@")) return false;
  if (isGuestEmail(clean)) return false;
  // Demo, test and placeholder accounts.
  return !/@(.+\.)?(test|local|invalid|example)$|@example\.(com|org|net)$/.test(clean);
}

export function approvalBroadcastActive(now = new Date()) {
  return (
    process.env.APPROVAL_BROADCAST_ENABLED?.trim().toLowerCase() !== "false" &&
    now < BROADCAST_ENDS_AT
  );
}

/** Everyone to tell, stores first, then riders, then buyers. One entry per email address. */
export async function loadApprovalBroadcastRecipients(): Promise<BroadcastRecipient[]> {
  const [vendors, riders, buyers] = await Promise.all([
    prisma.vendor.findMany({
      where: { createdAt: { lt: ACCOUNTS_CREATED_BEFORE }, status: { not: "SUSPENDED" } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        suburb: true,
        city: true,
        province: true,
        municipality: true,
        township: true,
        sectionArea: true,
        storeType: true,
        cuisine: true,
        etaMins: true,
        kycIdUrl: true,
        kycProofUrl: true,
        bankName: true,
        bankAccountName: true,
        bankAccountNumber: true,
        bankBranchCode: true,
        owner: { select: { name: true, email: true } },
        _count: {
          select: { products: true, items: true, hours: { where: { closed: false } } },
        },
      },
    }),
    prisma.riderApplication.findMany({
      where: { createdAt: { lt: ACCOUNTS_CREATED_BEFORE }, status: { not: "SUSPENDED" } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { createdAt: { lt: ACCOUNTS_CREATED_BEFORE }, role: "CUSTOMER" },
      orderBy: { createdAt: "asc" },
      select: { email: true, name: true, phone: true },
    }),
  ]);

  const seen = new Set<string>();
  const recipients: BroadcastRecipient[] = [];
  const add = (recipient: BroadcastRecipient) => {
    const key = recipient.email.trim().toLowerCase();
    if (!isBroadcastableEmail(key) || seen.has(key)) return;
    seen.add(key);
    recipients.push({ ...recipient, email: key });
  };

  for (const vendor of vendors) {
    const readiness = getVendorReadiness({
      ...vendor,
      productCount: vendor._count.products,
      menuItemCount: vendor._count.items,
      operatingHoursCount: vendor._count.hours,
    });
    add({
      audience: "vendor",
      email: vendor.owner?.email || vendor.email || "",
      phone: vendor.phone,
      name: vendor.owner?.name,
      storeName: vendor.name,
      missing: readiness.checks
        .filter((check) => check.required && !check.complete)
        .map((check) => check.label),
    });
  }
  for (const rider of riders) {
    add({
      audience: "rider",
      email: rider.email,
      phone: rider.phone,
      name: rider.fullName,
      missing: getRiderReadiness(rider).missing,
    });
  }
  for (const buyer of buyers) {
    add({ audience: "buyer", email: buyer.email, phone: buyer.phone, name: buyer.name });
  }
  return recipients;
}

async function sendOne(recipient: BroadcastRecipient) {
  const message = buildApprovalEmail(recipient);
  const key = `email:${recipient.email}`;
  if (!(await claimOrderNotification(APPROVAL_BROADCAST_ID, key, "email"))) return false;

  try {
    const result = await sendResendEmail({
      to: recipient.email,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments,
    });
    if (!result.delivered) throw new Error("Email not sent.");
  } catch {
    // Try once more on a later run, then leave that address alone.
    if (await claimOrderNotification(APPROVAL_BROADCAST_ID, `retry:${recipient.email}`, "email")) {
      await releaseOrderNotification(APPROVAL_BROADCAST_ID, key, "email");
    }
    return true;
  }

  if (
    recipient.phone &&
    hasWhatsAppChannel() &&
    (await claimOrderNotification(APPROVAL_BROADCAST_ID, key, "whatsapp"))
  ) {
    await sendTwilioWhatsApp({ to: recipient.phone, body: message.whatsapp }).catch(() => null);
  }
  return true;
}

let lastRunAt = 0;
let finished = false;

/** Sends the next batch of approval emails. Called by the order sweep cron. */
export async function runApprovalBroadcast() {
  if (finished || !approvalBroadcastActive() || !hasEmailChannel()) return { sent: 0 };
  // The cron endpoint is open, so one server instance runs at most once a minute.
  if (Date.now() - lastRunAt < 60_000) return { sent: 0 };
  lastRunAt = Date.now();
  const startedAt = Date.now();

  const recipients = await loadApprovalBroadcastRecipients();
  let sent = 0;
  for (const recipient of recipients) {
    if (sent >= MAX_SENDS_PER_RUN || Date.now() - startedAt > MAX_RUN_MS) break;
    if (await sendOne(recipient).catch(() => false)) {
      sent += 1;
      await new Promise((resolve) => setTimeout(resolve, GAP_BETWEEN_SENDS_MS));
    }
  }
  if (sent === 0) finished = true;
  return { sent };
}
