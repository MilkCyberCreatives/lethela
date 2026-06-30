export type CookieConsentState = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  push: boolean;
  updatedAt: string;
};

export const COOKIE_CONSENT_KEY = "lethela_cookie_consent";

export function readCookieConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    return {
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      push: Boolean(parsed.push),
      updatedAt: String(parsed.updatedAt || ""),
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(input: {
  analytics: boolean;
  marketing: boolean;
  push: boolean;
}) {
  if (typeof window === "undefined") return;
  const next: CookieConsentState = {
    essential: true,
    analytics: input.analytics,
    marketing: input.marketing,
    push: input.push,
    updatedAt: new Date().toISOString(),
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
