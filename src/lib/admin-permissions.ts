import { normalizeAppRole, type AppRole } from "@/lib/auth-security";

export type AdminPermission =
  | "admin:read"
  | "vendors:approve"
  | "products:approve"
  | "riders:approve"
  | "orders:manage"
  | "refunds:manage"
  | "payouts:manage"
  | "staff:manage"
  | "security:manage"
  | "notifications:send";

const ROLE_PERMISSIONS: Record<
  Exclude<AppRole, "CUSTOMER" | "VENDOR" | "RIDER">,
  AdminPermission[]
> = {
  OWNER: [
    "admin:read",
    "vendors:approve",
    "products:approve",
    "riders:approve",
    "orders:manage",
    "refunds:manage",
    "payouts:manage",
    "staff:manage",
    "security:manage",
    "notifications:send",
  ],
  ADMIN: [
    "admin:read",
    "vendors:approve",
    "products:approve",
    "riders:approve",
    "orders:manage",
    "refunds:manage",
    "payouts:manage",
    "notifications:send",
  ],
  OPERATIONS_MANAGER: [
    "admin:read",
    "vendors:approve",
    "products:approve",
    "riders:approve",
    "orders:manage",
    "notifications:send",
  ],
  SUPPORT_AGENT: ["admin:read"],
  FINANCE: ["admin:read", "refunds:manage", "payouts:manage"],
};

export function hasAdminPermission(roleValue: unknown, permission: AdminPermission) {
  const role = normalizeAppRole(roleValue);
  if (role === "CUSTOMER" || role === "VENDOR" || role === "RIDER") return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}
