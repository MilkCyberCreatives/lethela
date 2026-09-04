// Direct Google OAuth support.
//
// Sign-in and sign-up with Google go straight through NextAuth's Google provider
// (OAuth 2.0 against Google's own endpoints). There is no third-party auth broker
// in the middle — the app talks to Google directly and stores the linked account
// in our own database via the Prisma adapter.

export const OAUTH_INTENT_COOKIE = "lethela.oauth-intent";

export type OAuthIntent = "customer" | "vendor" | "rider";

/**
 * True when both direct Google OAuth credentials are configured. The Google
 * buttons only render when this is true, so a missing credential simply hides
 * the option instead of producing a broken sign-in.
 */
export function isGoogleAuthEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function normalizeOAuthIntent(value: string | null | undefined): OAuthIntent {
  return value === "vendor" || value === "rider" ? value : "customer";
}

export function roleForOAuthIntent(intent: OAuthIntent): "CUSTOMER" | "VENDOR" | "RIDER" {
  if (intent === "vendor") return "VENDOR";
  if (intent === "rider") return "RIDER";
  return "CUSTOMER";
}

/**
 * Records which sign-up flow a Google request started from so the OAuth callback
 * can provision the matching profile. Set from the browser right before calling
 * `signIn("google")`; it only affects brand-new accounts.
 */
export function rememberOAuthIntent(intent: OAuthIntent) {
  if (typeof document === "undefined") return;
  document.cookie = `${OAUTH_INTENT_COOKIE}=${intent}; path=/; max-age=600; samesite=lax`;
}
