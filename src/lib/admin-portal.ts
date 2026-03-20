export const ADMIN_KEY_STORAGE_KEY = "lethela_admin_key";
const DEFAULT_ADMIN_PORTAL_PATH = "/owner-access";
const INTERNAL_ADMIN_LOGIN_PATH = "/admin-login";

function normalizePath(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

export function getInternalAdminLoginPath() {
  return INTERNAL_ADMIN_LOGIN_PATH;
}

export function getAdminPortalPath() {
  const configured = normalizePath(process.env.ADMIN_PORTAL_PATH);
  if (configured && configured !== INTERNAL_ADMIN_LOGIN_PATH) {
    return configured;
  }
  return DEFAULT_ADMIN_PORTAL_PATH;
}
