"use client";

import { useEffect, useState } from "react";
import { hasCookieConsent, readCookieConsent, writeCookieConsent } from "@/lib/cookie-consent";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reopen = () => setVisible(true);
    window.addEventListener("lethela:cookie-consent-settings", reopen);

    const existing = readCookieConsent();
    if (!existing) {
      setVisible(true);
    }

    return () => window.removeEventListener("lethela:cookie-consent-settings", reopen);
  }, []);

  function save(status: "accepted" | "declined") {
    writeCookieConsent(status);
    setVisible(false);
  }

  if (!visible || hasCookieConsent()) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/15 bg-[#151515]/95 px-4 py-4 text-white shadow-2xl backdrop-blur">
      <div className="container flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold">Cookies on Lethela</p>
          <p className="mt-1 text-sm leading-6 text-white/75">
            Lethela uses cookies to keep the platform working, improve performance and understand
            how people use the site. You can accept or decline non-essential cookies.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => save("declined")}
            className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => save("accepted")}
            className="rounded-md bg-lethela-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
