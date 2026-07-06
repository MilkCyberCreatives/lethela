import crypto from "node:crypto";
import { prisma, prismaRuntimeInfo } from "@/lib/db";

type AdminAuditInput = {
  actor: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
};

let setupPromise: Promise<void> | null = null;

function ensureAuditTable() {
  if (!setupPromise) {
    setupPromise = prisma
      .$executeRawUnsafe(
        `
        CREATE TABLE IF NOT EXISTS app_admin_audit_logs (
          id TEXT PRIMARY KEY,
          actor TEXT NOT NULL,
          action TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          before_json TEXT,
          after_json TEXT,
          created_at TEXT NOT NULL
        )
      `,
      )
      .then(() => undefined);
  }
  return setupPromise;
}

export async function logAdminAudit(input: AdminAuditInput) {
  try {
    await ensureAuditTable();
    const values = [
      crypto.randomUUID(),
      input.actor,
      input.action,
      input.targetType,
      input.targetId,
      input.before ? JSON.stringify(input.before) : null,
      input.after ? JSON.stringify(input.after) : null,
      new Date().toISOString(),
    ];
    const placeholders =
      prismaRuntimeInfo.provider === "postgresql"
        ? values.map((_, index) => `$${index + 1}`).join(", ")
        : values.map(() => "?").join(", ");
    await prisma.$executeRawUnsafe(
      `INSERT INTO app_admin_audit_logs
       (id, actor, action, target_type, target_id, before_json, after_json, created_at)
       VALUES (${placeholders})`,
      ...values,
    );
  } catch {
    // Audit logging should never block an approval action.
  }
}

export async function listAdminAuditLogs(limit = 60) {
  await ensureAuditTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      actor: string;
      action: string;
      target_type: string;
      target_id: string;
      before_json: string | null;
      after_json: string | null;
      created_at: string;
    }>
  >(
    `SELECT id, actor, action, target_type, target_id, before_json, after_json, created_at
     FROM app_admin_audit_logs
     ORDER BY created_at DESC
     LIMIT ${Math.min(100, Math.max(1, Math.round(limit)))}`,
  );

  return rows.map((row) => ({
    id: row.id,
    actor: row.actor,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    before: row.before_json,
    after: row.after_json,
    createdAt: row.created_at,
  }));
}
