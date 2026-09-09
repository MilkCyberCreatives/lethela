import { COOKIE_CONSENT_KEY, COOKIE_CONSENT_VERSION } from "@/lib/cookie-consent";

// Runs during HTML parse, before hydration: marks the document so the SSR'd
// cookie banner is hidden for visitors who have already chosen, and stays
// painted in the first frame for those who have not. Keeps the banner out of
// the "large element that paints late" LCP trap without a client round-trip.
const BOOT = `(function(){try{var r=localStorage.getItem(${JSON.stringify(
  COOKIE_CONSENT_KEY,
)});var ok=false;if(r){var p=JSON.parse(r);var t=Date.parse((p&&p.updatedAt)||"");ok=isFinite(t)&&(Date.now()-t)<31536000000&&p.version===${JSON.stringify(
  COOKIE_CONSENT_VERSION,
)};}document.documentElement.setAttribute("data-lethela-cc",ok?"set":"pending");}catch(e){document.documentElement.setAttribute("data-lethela-cc","pending");}})();`;

export default function CookieConsentBoot() {
  return <script dangerouslySetInnerHTML={{ __html: BOOT }} />;
}
