export type AppRole =
  | "OWNER"
  | "ADMIN"
  | "OPERATIONS_MANAGER"
  | "SUPPORT_AGENT"
  | "FINANCE"
  | "CUSTOMER"
  | "VENDOR"
  | "RIDER";

const STAFF_ROLES = new Set<AppRole>([
  "OWNER",
  "ADMIN",
  "OPERATIONS_MANAGER",
  "SUPPORT_AGENT",
  "FINANCE",
]);

export function normalizeAppRole(value: unknown): AppRole {
  const role = String(value || "")
    .trim()
    .toUpperCase();
  if (role === "USER") return "CUSTOMER";
  if (
    role === "OWNER" ||
    role === "ADMIN" ||
    role === "OPERATIONS_MANAGER" ||
    role === "SUPPORT_AGENT" ||
    role === "FINANCE" ||
    role === "CUSTOMER" ||
    role === "VENDOR" ||
    role === "RIDER"
  ) {
    return role;
  }
  return "CUSTOMER";
}

export function isAdminRole(value: unknown) {
  return STAFF_ROLES.has(normalizeAppRole(value));
}

export function safePostLoginPath(role: AppRole, requestedPath?: string | null) {
  const requested = String(requestedPath || "").trim();
  const safeRequested = requested.startsWith("/") && !requested.startsWith("//") ? requested : "";

  if (STAFF_ROLES.has(role)) {
    return safeRequested.startsWith("/admin") ? safeRequested : "/owner-access";
  }
  if (role === "VENDOR") return "/vendors/dashboard";
  if (role === "RIDER") {
    return safeRequested.startsWith("/rider/dashboard") ? safeRequested : "/rider/dashboard";
  }
  return safeRequested || "/";
}
