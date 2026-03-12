const DEFAULT_PRODUCTION_SITE_URL = "https://www.lethela.co.za";
const DEFAULT_SITE_URL = process.env.NODE_ENV === "production" ? DEFAULT_PRODUCTION_SITE_URL : "http://localhost:3000";

function normalizeSiteUrl(input?: string | null) {
  const value = (input || "").trim();
  if (!value) return DEFAULT_SITE_URL;

  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/+$/, "");
  }

  return `https://${value.replace(/\/+$/, "")}`;
}

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  (process.env.NODE_ENV === "production" ? DEFAULT_PRODUCTION_SITE_URL : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

export const SITE_URL = normalizeSiteUrl(rawSiteUrl);
export const SITE_NAME = "Lethela";
export const SITE_DESCRIPTION =
  "Lethela is an AI-supported South African food and grocery delivery platform for township and urban communities.";

export function absoluteUrl(path = "/") {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`;
}
