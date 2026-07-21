import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { auth } from "@/auth";
import { ADMIN_ACCESS_COOKIE_NAME, readAdminAccessToken } from "@/lib/admin-access";
import { hasAdminPermission, type AdminPermission } from "@/lib/admin-permissions";
import { normalizeAppRole, type AppRole } from "@/lib/auth-security";

type AdminGuardResult =
  | {
      ok: true;
      mode: "key" | "key-cookie" | "dev-bypass";
      role: AppRole;
      actor: string;
    }
  | { ok: false; status: number; error: string };

function secretsEqual(left: string | undefined, right: string | undefined) {
  if (!left || !right) return false;
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export async function requireAdminRequest(
  req: NextRequest,
  permission: AdminPermission = "admin:read",
): Promise<AdminGuardResult> {
  const adminKey = process.env.ADMIN_APPROVAL_KEY?.trim();
  const providedKey = req.headers.get("x-admin-key")?.trim();
  const accessCookie = req.cookies.get(ADMIN_ACCESS_COOKIE_NAME)?.value?.trim();
  const allowDevBypass =
    process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_ADMIN_BYPASS === "true";

  if (secretsEqual(providedKey, adminKey)) {
    return { ok: true, mode: "key", role: "OWNER", actor: "owner-api-key" };
  }

  if (allowDevBypass) {
    return { ok: true, mode: "dev-bypass", role: "OWNER", actor: "local-dev-bypass" };
  }

  try {
    const session = await auth();
    const role = normalizeAppRole(session?.user?.role);
    if (
      session?.user?.id &&
      accessCookie &&
      readAdminAccessToken(accessCookie)?.sub === session.user.id &&
      hasAdminPermission(role, permission)
    ) {
      return { ok: true, mode: "key-cookie", role, actor: `user:${session.user.id}` };
    }
  } catch {
    // ignore auth adapter issues and continue to fallback checks
  }

  return {
    ok: false,
    status: 401,
    error: adminKey
      ? "Admin sign-in and security verification are required."
      : "Admin access is not configured.",
  };
}
