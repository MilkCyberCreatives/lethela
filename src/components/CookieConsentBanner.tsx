"use client";

import { useEffect, useState } from "react";
import {
  canUsePushCookies,
  hasCookieConsent,
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/cookie-consent";
import { registerPushSubscription } from "@/lib/visitor";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [updates, setUpdates] = useState(true);

  useEffect(() => {
    const existing = readCookieConsent();
    if (!existing) {
      setVisible(true);
      return;
    }
    setAnalytics(existing.analytics);
    setUpdates(existing.marketing || existing.push);
  }, []);

  async function save(next: { analytics: boolean; marketing: boolean; push: boolean }) {
    writeCookieConsent(next);
    setVisible(false);
    setSettingsOpen(false);
    if (next.push && canUsePushCookies()) {
      await registerPushSubscription().catch(() => undefined);
    }
  }

  if (!visible || hasCookieConsent()) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/15 bg-[#151515]/95 px-4 py-4 text-white shadow-2xl backdrop-blur">
      <div className="container flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold">Cookie preferences</p>
          <p className="mt-1 text-sm leading-6 text-white/75">
            We use essential cookies to run Lethela. Optional cookies help us measure search
            quality, remember update preferences, and send push notifications when you allow them.
          </p>
          {settingsOpen ? (
            <div className="mt-3 grid gap-2 text-sm text-white/80 sm:grid-cols-3">
              <label className="flex items-center gap-2 rounded-md border border-white/10 p-3">
                <input type="checkbox" checked readOnly />
                Essential
              </label>
              <label className="flex items-center gap-2 rounded-md border border-white/10 p-3">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(event) => setAnalytics(event.target.checked)}
                />
                Analytics
              </label>
              <label className="flex items-center gap-2 rounded-md border border-white/10 p-3">
                <input
                  type="checkbox"
                  checked={updates}
                  onChange={(event) => setUpdates(event.target.checked)}
                />
                Updates & push
              </label>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
            className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => save({ analytics: false, marketing: false, push: false })}
            className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white"
          >
            Essentials only
          </button>
          <button
            type="button"
            onClick={() =>
              settingsOpen
                ? save({ analytics, marketing: updates, push: updates })
                : save({ analytics: true, marketing: true, push: true })
            }
            className="rounded-md bg-lethela-primary px-4 py-2 text-sm font-semibold text-white"
          >
            {settingsOpen ? "Save choices" : "Accept all"}
          </button>
        </div>
      </div>
    </div>
  );
}
