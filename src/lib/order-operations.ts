import crypto from "node:crypto";
import { prisma, prismaRuntimeInfo } from "@/lib/db";

export type OperationOrderStatus =
  | "PLACED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELED";

type EventInput = {
  orderId: string;
  publicId: string;
  type: string;
  actor?: string | null;
  note?: string | null;
  meta?: unknown;
};

type RefundInput = {
  orderId: string;
  publicId: string;
  amountCents: number;
  reason: string;
  status?: string;
  evidenceUrl?: string | null;
  note?: string | null;
  actor?: string | null;
};

type DispatchInput = {
  orderId: string;
  publicId: string;
  riderApplicationId: string;
  riderName: string;
  riderPhone: string;
  status?: string;
  note?: string | null;
  actor?: string | null;
};

let setupPromise: Promise<void> | null = null;

function placeholders(count: number) {
  return prismaRuntimeInfo.provider === "postgresql"
    ? Array.from({ length: count }, (_, index) => `$${index + 1}`).join(", ")
    : Array.from({ length: count }, () => "?").join(", ");
}

export function ensureOrderOperationsTables() {
  if (!setupPromise) {
    setupPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS app_order_events (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          public_id TEXT NOT NULL,
          type TEXT NOT NULL,
          actor TEXT,
          note TEXT,
          meta_json TEXT,
          created_at TEXT NOT NULL
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS app_refund_cases (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          public_id TEXT NOT NULL,
          amount_cents INTEGER NOT NULL,
          reason TEXT NOT NULL,
          status TEXT NOT NULL,
          evidence_url TEXT,
          note TEXT,
          created_by TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS app_order_dispatches (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          public_id TEXT NOT NULL,
          rider_application_id TEXT NOT NULL,
          rider_name TEXT NOT NULL,
          rider_phone TEXT NOT NULL,
          status TEXT NOT NULL,
          note TEXT,
          created_by TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS app_order_events_public_id_idx ON app_order_events(public_id, created_at)`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS app_refund_cases_status_idx ON app_refund_cases(status, created_at)`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS app_order_dispatches_status_idx ON app_order_dispatches(status, created_at)`,
      );
    })();
  }
  return setupPromise;
}

export async function recordOrderEvent(input: EventInput) {
  await ensureOrderOperationsTables();
  const values = [
    crypto.randomUUID(),
    input.orderId,
    input.publicId,
    input.type,
    input.actor || null,
    input.note || null,
    input.meta ? JSON.stringify(input.meta) : null,
    new Date().toISOString(),
  ];
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_order_events
     (id, order_id, public_id, type, actor, note, meta_json, created_at)
     VALUES (${placeholders(values.length)})`,
    ...values,
  );
}

export async function createRefundCase(input: RefundInput) {
  await ensureOrderOperationsTables();
  const now = new Date().toISOString();
  const values = [
    crypto.randomUUID(),
    input.orderId,
    input.publicId,
    Math.max(0, Math.round(Number(input.amountCents || 0))),
    input.reason.trim(),
    input.status || "REQUESTED",
    input.evidenceUrl || null,
    input.note || null,
    input.actor || null,
    now,
    now,
  ];
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_refund_cases
     (id, order_id, public_id, amount_cents, reason, status, evidence_url, note, created_by, created_at, updated_at)
     VALUES (${placeholders(values.length)})`,
    ...values,
  );
}

export async function createDispatchAssignment(input: DispatchInput) {
  await ensureOrderOperationsTables();
  const now = new Date().toISOString();
  const values = [
    crypto.randomUUID(),
    input.orderId,
    input.publicId,
    input.riderApplicationId,
    input.riderName,
    input.riderPhone,
    input.status || "ASSIGNED",
    input.note || null,
    input.actor || null,
    now,
    now,
  ];
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_order_dispatches
     (id, order_id, public_id, rider_application_id, rider_name, rider_phone, status, note, created_by, created_at, updated_at)
     VALUES (${placeholders(values.length)})`,
    ...values,
  );
}

export async function listOperationRows() {
  await ensureOrderOperationsTables();
  const [events, refunds, dispatches] = await Promise.all([
    prisma.$queryRawUnsafe<
      Array<{
        id: string;
        public_id: string;
        type: string;
        actor: string | null;
        note: string | null;
        created_at: string;
      }>
    >(
      `SELECT id, public_id, type, actor, note, created_at
       FROM app_order_events ORDER BY created_at DESC LIMIT 60`,
    ),
    prisma.$queryRawUnsafe<
      Array<{
        id: string;
        public_id: string;
        amount_cents: number;
        reason: string;
        status: string;
        evidence_url: string | null;
        note: string | null;
        created_at: string;
        updated_at: string;
      }>
    >(
      `SELECT id, public_id, amount_cents, reason, status, evidence_url, note, created_at, updated_at
       FROM app_refund_cases ORDER BY created_at DESC LIMIT 60`,
    ),
    prisma.$queryRawUnsafe<
      Array<{
        id: string;
        public_id: string;
        rider_application_id: string;
        rider_name: string;
        rider_phone: string;
        status: string;
        note: string | null;
        created_at: string;
        updated_at: string;
      }>
    >(
      `SELECT id, public_id, rider_application_id, rider_name, rider_phone, status, note, created_at, updated_at
       FROM app_order_dispatches ORDER BY created_at DESC LIMIT 60`,
    ),
  ]);

  return {
    events: events.map((event) => ({
      id: event.id,
      publicId: event.public_id,
      type: event.type,
      actor: event.actor,
      note: event.note,
      createdAt: event.created_at,
    })),
    refunds: refunds.map((refund) => ({
      id: refund.id,
      publicId: refund.public_id,
      amountCents: Number(refund.amount_cents || 0),
      reason: refund.reason,
      status: refund.status,
      evidenceUrl: refund.evidence_url,
      note: refund.note,
      createdAt: refund.created_at,
      updatedAt: refund.updated_at,
    })),
    dispatches: dispatches.map((dispatch) => ({
      id: dispatch.id,
      publicId: dispatch.public_id,
      riderApplicationId: dispatch.rider_application_id,
      riderName: dispatch.rider_name,
      riderPhone: dispatch.rider_phone,
      status: dispatch.status,
      note: dispatch.note,
      createdAt: dispatch.created_at,
      updatedAt: dispatch.updated_at,
    })),
  };
}
