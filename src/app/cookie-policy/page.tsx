import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Lethela uses essential and optional cookies.",
  alternates: { canonical: "/cookie-policy" },
};

export default function CookiePolicyPage() {
  return (
    <LegalPageShell
      title="Cookie Policy"
      intro="This policy explains the small amount of browser storage Lethela uses to operate the marketplace safely."
      note={`Last updated: ${LEGAL_LAST_UPDATED}. Use Cookie Settings in the footer to accept or decline optional cookies.`}
    >
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold">Essential storage</h2>
        <p className="mt-3 text-sm leading-7 text-white/72">
          Authentication, security, session, cart and saved-consent data remain available because
          they are required for requested platform functions. Cart storage must not contain payment
          details or identity documents.
        </p>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold">Optional analytics and marketing</h2>
        <p className="mt-3 text-sm leading-7 text-white/72">
          These scripts load only after Accept. Decline keeps them disabled. Consent stores the
          choice, timestamp and policy version for up to 12 months, and reopens when the version
          changes.
        </p>
        <p className="mt-3 text-sm leading-7 text-white/72">
          They include Google Analytics or Tag Manager where set up, Vercel Analytics, and the Meta
          Pixel with the Meta Conversions API, which let Facebook and Instagram show Lethela adverts
          to people who visited the site.
        </p>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold">Visit counting</h2>
        <p className="mt-3 text-sm leading-7 text-white/72">
          A random visitor number in your browser lets Lethela count visits in its own database:
          pages opened, where the visit came from and how far it got towards an order. It holds no
          name, email or phone number, is not shared, and is only linked to your account after you
          accept optional cookies.
        </p>
      </section>
    </LegalPageShell>
  );
}
