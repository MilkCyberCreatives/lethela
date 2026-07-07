export type CookieConsentState = {
  essential: true;
  status: "accepted" | "declined";
  analytics: boolean;
  marketing: boolean;
  push: boolean;
  updatedAt: string;
  version: string;
};

export const COOKIE_CONSENT_KEY = "lethela_cookie_consent";
export const COOKIE_CONSENT_VERSION = "2026-07-07";
const COOKIE_CONSENT_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000;

export function readCookieConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    const updatedAt = String(parsed.updatedAt || "");
    const updatedTime = Date.parse(updatedAt);
    const expired =
      !Number.isFinite(updatedTime) || Date.now() - updatedTime > COOKIE_CONSENT_EXPIRY_MS;
    if (expired || parsed.version !== COOKIE_CONSENT_VERSION) return null;
    const status = parsed.status === "accepted" ? "accepted" : "declined";
    return {
      essential: true,
      status,
      analytics: status === "accepted",
      marketing: status === "accepted",
      push: false,
      updatedAt,
      version: COOKIE_CONSENT_VERSION,
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(
  statusOrInput:
    | "accepted"
    | "declined"
    | {
        analytics: boolean;
        marketing: boolean;
        push: boolean;
      },
) {
  if (typeof window === "undefined") return;
  const status =
    typeof statusOrInput === "string"
      ? statusOrInput
      : statusOrInput.analytics || statusOrInput.marketing || statusOrInput.push
        ? "accepted"
        : "declined";
  const next: CookieConsentState = {
    essential: true,
    status,
    analytics: status === "accepted",
    marketing: status === "accepted",
    push: false,
    updatedAt: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("lethela:cookie-consent-changed", { detail: next }));
}

export function hasCookieConsent() {
  return Boolean(readCookieConsent());
}

export function canUseAnalyticsCookies() {
  return Boolean(readCookieConsent()?.analytics);
}

export function canUsePushCookies() {
  return Boolean(readCookieConsent()?.push);
}

export function reopenCookieConsent() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(COOKIE_CONSENT_KEY);
  window.dispatchEvent(new CustomEvent("lethela:cookie-consent-settings"));
}
