"use client";

import { useEffect, useState } from "react";
import { hasCookieConsent, readCookieConsent, writeCookieConsent } from "@/lib/cookie-consent";

export default function CookieConsentBanner() {
  // Rendered on the server so it is part of the first paint (see
  // CookieConsentBoot, which hides it pre-hydration for anyone who already
  // chose). After hydration React takes over visibility.
  const [dismissed, setDismissed] = useState(false);
  const [revising, setRevising] = useState(false);

  useEffect(() => {
    const reopen = () => {
      setRevising(true);
      setDismissed(false);
    };
    window.addEventListener("lethela:cookie-consent-settings", reopen);

    if (readCookieConsent() || hasCookieConsent()) {
      setDismissed(true);
    }

    return () => window.removeEventListener("lethela:cookie-consent-settings", reopen);
  }, []);

  function save(status: "accepted" | "declined") {
    writeCookieConsent(status);
    setRevising(false);
    setDismissed(true);
  }

  if (dismissed && !revising) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      className="cookie-consent-banner fixed inset-x-0 bottom-0 z-[120] max-h-[85dvh] overflow-y-auto border-t border-white/15 bg-[#151515] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white shadow-2xl"
    >
      <div className="container flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <p id="cookie-consent-title" className="text-sm font-semibold">
            Cookies on Lethela
          </p>
          <p className="mt-1 text-sm leading-6 text-white/75">
            Lethela uses cookies to keep the platform working, improve performance and understand
            how people use the site. You can accept or decline non-essential cookies.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => save("declined")}
            className="min-h-11 flex-1 rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white sm:flex-none"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => save("accepted")}
            className="min-h-11 flex-1 rounded-md bg-lethela-primary px-4 py-2 text-sm font-semibold text-white sm:flex-none"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
