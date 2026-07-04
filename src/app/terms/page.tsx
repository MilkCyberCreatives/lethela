import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";
import {
  LEGAL_COMPANY_NAME,
  LEGAL_LAST_UPDATED,
  LEGAL_SERVICE_AREA,
  LEGAL_SUPPORT_EMAIL,
  LEGAL_WHATSAPP_LINK,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Core website, ordering, vendor and customer platform terms for Lethela.",
  alternates: {
    canonical: "/terms",
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

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      intro={`${LEGAL_COMPANY_NAME} provides a digital ordering, vendor management and delivery support platform. These terms govern customer, vendor and visitor use of the website and application.`}
      note={
        <>
          Last updated: {LEGAL_LAST_UPDATED}. Platform operator: {LEGAL_COMPANY_NAME}. Support:{" "}
          <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`} className="underline">
            {LEGAL_SUPPORT_EMAIL}
          </a>{" "}
          or{" "}
          <a href={LEGAL_WHATSAPP_LINK} target="_blank" rel="noreferrer" className="underline">
            WhatsApp support
          </a>
          .
        </>
      }
    >
      <Section title="Using the platform">
        <p>
          By using the platform you agree to provide accurate information, use the service lawfully,
          keep your login details secure, and avoid abuse, fraud, scraping, impersonation, unlawful
          payments, or interference with the site.
        </p>
      </Section>

      <Section title="Orders and availability">
        <p>
          Items, pricing, delivery times, operating hours and availability may change. A vendor may
          decline or adjust an order if stock is unavailable, the store is closing, or the order
          cannot reasonably be fulfilled.
        </p>
        <p>
          Product pages are invitations to order, not a guarantee that stock will remain available
          until the vendor accepts the order. Customers should check item notes, delivery address,
          delivery fees and substitution instructions before paying.
        </p>
      </Section>

      <Section title="Payments">
        <p>
          Online checkout is currently processed through Ozow. WhatsApp-assisted and manual order
          flows may be available for some transactions. Payment must be authorised before order
          release unless another arrangement is clearly confirmed.
        </p>
      </Section>

      <Section title="Delivery and service area">
        <p>
          Delivery estimates are not guarantees. Delays may occur because of traffic, weather, rider
          availability, load-shedding, verification checks, or vendor preparation time. Current
          operating focus includes {LEGAL_SERVICE_AREA}.
        </p>
      </Section>

      <Section title="Age-restricted products">
        <p>
          Alcohol is hidden from public ordering while Lethela completes licence checks, age
          verification, rider handover rules, refusal handling and refund logic.
        </p>
        <p>
          Vendors may not list or fulfil restricted products publicly unless Lethela has approved
          the required documents, category controls and delivery process for that product type.
        </p>
      </Section>

      <Section title="Refunds, cancellations and complaints">
        <p>
          Refunds and cancellation outcomes depend on the order stage, payment status and issue
          reported. Please review the separate refund policy for more detail and contact support
          quickly when a problem occurs.
        </p>
        <p>
          Customer rights under the Consumer Protection Act and electronic commerce rules are not
          excluded. Where the law gives a customer a stronger remedy, that legal remedy applies.
          Perishable, prepared, customised or already-dispatched food may be handled differently
          from ordinary packaged goods.
        </p>
        <p>
          Customer complaints can be raised through WhatsApp support or email. Include the order
          reference, store name, phone number, issue details and photos where useful. Lethela will
          review the vendor, rider and payment record before confirming a correction, replacement,
          credit, partial refund or full refund.
        </p>
      </Section>

      <Section title="Vendor and rider responsibility">
        <p>
          Vendors remain responsible for their menus, pricing, preparation, food quality, lawful
          trading status and product compliance. Riders and delivery partners remain responsible for
          lawful conduct, safe delivery behaviour and route handling.
        </p>
        <p>
          Vendors selling groceries or other regulated goods must hold the registrations, licences
          or permissions required for their own business and product category. Lethela may suspend a
          listing where safety, licence, quality or consumer-law concerns arise.
        </p>
      </Section>

      <Section title="Intellectual property and website content">
        <p>
          The website design, content, logos, software, written material and brand elements remain
          owned by or licensed to
          {` ${LEGAL_COMPANY_NAME}`}. Users may not copy, republish or exploit site content without
          permission except as allowed by law.
        </p>
      </Section>

      <Section title="ECTA notice, liability and governing law">
        <p>
          These website terms form part of the site notice for purposes of South African electronic
          communications laws. To the extent permitted by law, platform liability is limited to
          direct losses reasonably linked to the service and excludes indirect or consequential
          loss. South African law governs these terms.
        </p>
        <p>
          Lethela aims to display clear supplier, price, delivery, cancellation and complaint
          information before checkout. South African law governs these terms and related platform
          disputes.
        </p>
      </Section>
    </LegalPageShell>
  );
}
