import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import {
  hasEmailChannel,
  hasWhatsAppChannel,
  sendResendEmail,
  sendTwilioWhatsApp,
  settleWithin,
} from "@/lib/notification-channels";
import { SITE_NAME } from "@/lib/site";

export type MessageRecipientType = "VENDOR" | "RIDER" | "ALL_VENDORS" | "ALL_RIDERS" | "ALL";

export type PlatformMessage = {
  id: string;
  recipientType: MessageRecipientType;
  recipientId: string | null;
  subject: string;
  body: string;
  channel: string;
  status: string;
  createdBy: string | null;
  createdAt: string;
  readAt: string | null;
};

type RecipientContact = {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
};

function isPostgres() {
  return String(process.env.DATABASE_PROVIDER || "").toLowerCase() === "postgresql";
}

function normalizeRow(row: Record<string, unknown>): PlatformMessage {
  return {
    id: String(row.id),
    recipientType: String(row.recipientType) as MessageRecipientType,
    recipientId: row.recipientId ? String(row.recipientId) : null,
    subject: String(row.subject || ""),
    body: String(row.body || ""),
    channel: String(row.channel || "DASHBOARD"),
    status: String(row.status || "SENT"),
    createdBy: row.createdBy ? String(row.createdBy) : null,
    createdAt: new Date(String(row.createdAt)).toISOString(),
    readAt: row.readAt ? new Date(String(row.readAt)).toISOString() : null,
  };
}

export async function ensurePlatformMessagesTable() {
  if (isPostgres()) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PlatformMessage" (
        "id" TEXT PRIMARY KEY,
        "recipientType" TEXT NOT NULL,
        "recipientId" TEXT,
        "subject" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "channel" TEXT NOT NULL DEFAULT 'DASHBOARD',
        "status" TEXT NOT NULL DEFAULT 'SENT',
        "createdBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "readAt" TIMESTAMP(3)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PlatformMessage_recipientType_recipientId_createdAt_idx"
      ON "PlatformMessage" ("recipientType", "recipientId", "createdAt")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PlatformMessage_createdAt_idx"
      ON "PlatformMessage" ("createdAt")
    `);
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlatformMessage" (
      "id" TEXT PRIMARY KEY,
      "recipientType" TEXT NOT NULL,
      "recipientId" TEXT,
      "subject" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "channel" TEXT NOT NULL DEFAULT 'DASHBOARD',
      "status" TEXT NOT NULL DEFAULT 'SENT',
      "createdBy" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "readAt" DATETIME
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PlatformMessage_recipientType_recipientId_createdAt_idx" ON "PlatformMessage" ("recipientType", "recipientId", "createdAt")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PlatformMessage_createdAt_idx" ON "PlatformMessage" ("createdAt")`,
  );
}

export async function createPlatformMessage(input: {
  recipientType: MessageRecipientType;
  recipientId?: string | null;
  subject: string;
  body: string;
  channel?: string;
  createdBy?: string | null;
}) {
  await ensurePlatformMessagesTable();
  const id = randomUUID();
  const valuesPlaceholder = isPostgres()
    ? "($1, $2, $3, $4, $5, $6, 'SENT', $7)"
    : "(?, ?, ?, ?, ?, ?, 'SENT', ?)";
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "PlatformMessage"
        ("id", "recipientType", "recipientId", "subject", "body", "channel", "status", "createdBy")
      VALUES ${valuesPlaceholder}
    `,
    id,
    input.recipientType,
    input.recipientId || null,
    input.subject,
    input.body,
    input.channel || "DASHBOARD",
    input.createdBy || null,
  );

  return {
    id,
    recipientType: input.recipientType,
    recipientId: input.recipientId || null,
    subject: input.subject,
    body: input.body,
    channel: input.channel || "DASHBOARD",
    status: "SENT",
    createdBy: input.createdBy || null,
    createdAt: new Date().toISOString(),
    readAt: null,
  } satisfies PlatformMessage;
}

export async function listRecentPlatformMessages(take = 50) {
  await ensurePlatformMessagesTable();
  const limitPlaceholder = isPostgres() ? "$1" : "?";
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `
      SELECT "id", "recipientType", "recipientId", "subject", "body", "channel", "status", "createdBy", "createdAt", "readAt"
      FROM "PlatformMessage"
      ORDER BY "createdAt" DESC
      LIMIT ${limitPlaceholder}
    `,
    Math.min(100, Math.max(1, take)),
  );
  return rows.map(normalizeRow);
}

export async function listMessagesForVendor(vendorId: string, take = 20) {
  await ensurePlatformMessagesTable();
  const vendorPlaceholder = isPostgres() ? "$1" : "?";
  const limitPlaceholder = isPostgres() ? "$2" : "?";
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `
      SELECT "id", "recipientType", "recipientId", "subject", "body", "channel", "status", "createdBy", "createdAt", "readAt"
      FROM "PlatformMessage"
      WHERE ("recipientType" = 'VENDOR' AND "recipientId" = ${vendorPlaceholder})
         OR "recipientType" = 'ALL_VENDORS'
         OR "recipientType" = 'ALL'
      ORDER BY "createdAt" DESC
      LIMIT ${limitPlaceholder}
    `,
    vendorId,
    Math.min(50, Math.max(1, take)),
  );
  return rows.map(normalizeRow);
}

export async function listMessagesForRider(riderApplicationId: string, take = 20) {
  await ensurePlatformMessagesTable();
  const riderPlaceholder = isPostgres() ? "$1" : "?";
  const limitPlaceholder = isPostgres() ? "$2" : "?";
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `
      SELECT "id", "recipientType", "recipientId", "subject", "body", "channel", "status", "createdBy", "createdAt", "readAt"
      FROM "PlatformMessage"
      WHERE ("recipientType" = 'RIDER' AND "recipientId" = ${riderPlaceholder})
         OR "recipientType" = 'ALL_RIDERS'
         OR "recipientType" = 'ALL'
      ORDER BY "createdAt" DESC
      LIMIT ${limitPlaceholder}
    `,
    riderApplicationId,
    Math.min(50, Math.max(1, take)),
  );
  return rows.map(normalizeRow);
}

async function recipientContacts(type: MessageRecipientType, id?: string | null) {
  if (type === "VENDOR" && id) {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: { name: true, email: true, phone: true },
    });
    return vendor ? [vendor] : [];
  }

  if (type === "RIDER" && id) {
    const rider = await prisma.riderApplication.findUnique({
      where: { id },
      select: { fullName: true, email: true, phone: true },
    });
    return rider ? [{ name: rider.fullName, email: rider.email, phone: rider.phone }] : [];
  }

  if (type === "ALL_VENDORS" || type === "ALL") {
    const vendors = await prisma.vendor.findMany({
      where: { status: "ACTIVE", isActive: true },
      select: { name: true, email: true, phone: true },
      take: 500,
    });
    if (type === "ALL_VENDORS") return vendors;
    const riders = await prisma.riderApplication.findMany({
      where: { status: "APPROVED" },
      select: { fullName: true, email: true, phone: true },
      take: 500,
    });
    return [
      ...vendors,
      ...riders.map((rider) => ({ name: rider.fullName, email: rider.email, phone: rider.phone })),
    ];
  }

  if (type === "ALL_RIDERS") {
    const riders = await prisma.riderApplication.findMany({
      where: { status: "APPROVED" },
      select: { fullName: true, email: true, phone: true },
      take: 500,
    });
    return riders.map((rider) => ({
      name: rider.fullName,
      email: rider.email,
      phone: rider.phone,
    }));
  }

  return [];
}

export async function notifyPlatformMessageRecipients(input: {
  recipientType: MessageRecipientType;
  recipientId?: string | null;
  subject: string;
  body: string;
}) {
  const contacts: RecipientContact[] = (
    await recipientContacts(input.recipientType, input.recipientId)
  ).filter((contact) => Boolean(contact.email || contact.phone));
  const tasks: Promise<unknown>[] = [];
  const text = [`${SITE_NAME} message`, "", input.subject, "", input.body].join("\n");

  if (hasEmailChannel()) {
    const emails = contacts.map((contact) => contact.email).filter(Boolean) as string[];
    if (emails.length > 0) {
      tasks.push(
        settleWithin(
          sendResendEmail({
            to: emails,
            subject: `${SITE_NAME}: ${input.subject}`,
            text,
          }),
          4000,
        ),
      );
    }
  }

  if (hasWhatsAppChannel()) {
    const phones = contacts.map((contact) => contact.phone).filter(Boolean) as string[];
    if (phones.length > 0) {
      tasks.push(settleWithin(sendTwilioWhatsApp({ to: phones, body: text }), 4000));
    }
  }

  await Promise.all(tasks);
  return {
    contacts: contacts.length,
    emailEnabled: hasEmailChannel(),
    whatsappEnabled: hasWhatsAppChannel(),
  };
}
