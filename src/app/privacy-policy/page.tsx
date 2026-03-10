import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { LEGAL_COMPANY_NAME, LEGAL_INFO_OFFICER_NAME, LEGAL_LAST_UPDATED, LEGAL_SUPPORT_EMAIL, LEGAL_WHATSAPP_LINK } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Lethela collects, uses, stores and protects personal information under POPIA.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-white/72">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      intro={`${LEGAL_COMPANY_NAME} processes personal information to run customer accounts, vendor onboarding, ordering, payment, delivery support and service communications. This policy explains the practical privacy rules we apply on the platform.`}
      note={
        <>
          Last updated: {LEGAL_LAST_UPDATED}. This page is written for platform use and customer clarity. It should still be
          reviewed against your final registered entity details before full commercial launch.
        </>
      }
    >
      <Section title="What we collect">
        <p>
          We may collect account details, names, phone numbers, email addresses, delivery locations, order history, vendor
          registration information, rider application information, device and usage data, support messages, and payment
          references needed to complete transactions.
        </p>
      </Section>

      <Section title="How we use personal information">
        <p>
          We use data to create accounts, process orders, route deliveries, provide WhatsApp support, verify vendor or rider
          applications, improve recommendations, reduce fraud, maintain platform security, and meet legal or operational
          obligations.
        </p>
      </Section>

      <Section title="Who we share information with">
        <p>
          Information may be shared only where needed with approved vendors, riders, payment partners, hosting or storage
          providers, maps and delivery tools, support service providers, and advisers where disclosure is necessary for service
          delivery, security, or legal compliance.
        </p>
      </Section>

      <Section title="Payments and financial data">
        <p>
          Online checkout is currently processed through Ozow. Lethela stores order and payment references needed for customer
          service and reconciliation, but banking authentication is handled through the payment flow itself.
        </p>
      </Section>

      <Section title="Cookies and platform analytics">
        <p>
          We use essential cookies and local storage for login state, cart contents, saved meal preferences, ratings, and basic
          site functionality. We may also use limited analytics, fraud prevention and marketing tools where appropriate.
        </p>
      </Section>

      <Section title="Your POPIA rights">
        <p>
          Subject to POPIA and other applicable law, you may request access to your information, ask for correction, object to
          certain processing, request deletion where legally permitted, and complain if you believe your information has been
          handled unlawfully.
        </p>
      </Section>

      <Section title="Security and retention">
        <p>
          We use reasonable technical and organisational safeguards to protect information. Records are kept for as long as
          required for customer service, platform operations, dispute handling, legal compliance, and fraud prevention.
        </p>
      </Section>

      <Section title="Direct marketing">
        <p>
          Marketing messages should only be sent where lawful and appropriate. You may opt out of direct marketing at any time
          by using the unsubscribe instruction in the message or contacting Lethela support.
        </p>
      </Section>

      <Section title="Privacy contact and complaints">
        <p>
          Privacy contact / Information Officer: {LEGAL_INFO_OFFICER_NAME}
          {LEGAL_SUPPORT_EMAIL ? (
            <>
              {" "}
              via <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`} className="underline">{LEGAL_SUPPORT_EMAIL}</a>
            </>
          ) : null}
          {" "}
          or <a href={LEGAL_WHATSAPP_LINK} target="_blank" rel="noreferrer" className="underline">WhatsApp support</a>.
        </p>
        <p>
          If you remain dissatisfied after contacting us, you may contact the South African Information Regulator. You can also
          review our <Link href="/popia" className="underline">POPIA notice</Link> and <Link href="/paia-manual" className="underline">PAIA access guide</Link>.
        </p>
      </Section>
    </LegalPageShell>
  );
}
