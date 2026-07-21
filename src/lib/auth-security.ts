import crypto from "node:crypto";
import { prisma, prismaRuntimeInfo } from "@/lib/db";
export { isAdminRole, normalizeAppRole, safePostLoginPath, type AppRole } from "@/lib/auth-roles";

export const ACCOUNT_LOCK_ATTEMPTS = 5;
export const ACCOUNT_LOCK_MINUTES = 15;

let setupPromise: Promise<void> | null = null;

function ensureSecurityEventTable() {
  if (!setupPromise) {
    setupPromise = prisma
      .$executeRawUnsafe(
        `
        CREATE TABLE IF NOT EXISTS app_auth_security_events (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          email_hash TEXT NOT NULL,
          event_type TEXT NOT NULL,
          outcome TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `,
      )
      .then(() => undefined);
  }
  return setupPromise;
}

export async function recordAuthSecurityEvent(input: {
  userId?: string | null;
  email: string;
  eventType: "LOGIN" | "LOGOUT" | "PASSWORD_RESET" | "ACCOUNT_LOCKED";
  outcome: "SUCCESS" | "FAILED" | "BLOCKED";
}) {
  try {
    await ensureSecurityEventTable();
    const values = [
      crypto.randomUUID(),
      input.userId || null,
      crypto.createHash("sha256").update(input.email.trim().toLowerCase()).digest("hex"),
      input.eventType,
      input.outcome,
      new Date().toISOString(),
    ];
    const placeholders =
      prismaRuntimeInfo.provider === "postgresql"
        ? values.map((_, index) => `$${index + 1}`).join(", ")
        : values.map(() => "?").join(", ");
    await prisma.$executeRawUnsafe(
      `INSERT INTO app_auth_security_events
       (id, user_id, email_hash, event_type, outcome, created_at)
       VALUES (${placeholders})`,
      ...values,
    );
  } catch {
    // Authentication remains available if the audit store is temporarily unavailable.
  }
}
