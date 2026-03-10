import { NextRequest } from "next/server";
import { auth } from "@/auth";

type AdminGuardResult =
  | { ok: true; mode: "session" | "key" | "dev-bypass" }
  | { ok: false; status: number; error: string };

export async function requireAdminRequest(req: NextRequest): Promise<AdminGuardResult> {
  const adminKey = process.env.ADMIN_APPROVAL_KEY?.trim();
  const providedKey = req.headers.get("x-admin-key")?.trim();

  if (adminKey && providedKey && providedKey === adminKey) {
    return { ok: true, mode: "key" };
  }

  try {
    const session = await auth();
    if (session?.user?.role === "ADMIN") {
      return { ok: true, mode: "session" };
    }
  } catch {
    // ignore auth adapter issues and continue to fallback checks
  }

  if (!adminKey && process.env.NODE_ENV !== "production") {
    return { ok: true, mode: "dev-bypass" };
  }

  return {
    ok: false,
    status: 401,
    error: adminKey
      ? "Admin access required. Sign in as admin or provide a valid admin key."
      : "Admin access required. Set ADMIN_APPROVAL_KEY or sign in as an admin user.",
  };
}
