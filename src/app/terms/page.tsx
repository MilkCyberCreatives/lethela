import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { LEGAL_COMPANY_NAME, LEGAL_LAST_UPDATED, LEGAL_SERVICE_AREA } from "@/lib/legal";

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
      note={<>Last updated: {LEGAL_LAST_UPDATED}. These terms are a practical operating version and should be reviewed together with your final merchant, company and consumer law requirements before launch.</>}
    >
      <Section title="Using the platform">
        <p>
          By using the platform you agree to provide accurate information, use the service lawfully, keep your login details
          secure, and avoid abuse, fraud, scraping, impersonation, unlawful payments, or interference with the site.
        </p>
      </Section>

      <Section title="Orders and availability">
        <p>
          Items, pricing, delivery times, operating hours and availability may change. A vendor may decline or adjust an order
          if stock is unavailable, the store is closing, or the order cannot reasonably be fulfilled.
        </p>
      </Section>

      <Section title="Payments">
        <p>
          Online checkout is currently processed through Ozow. WhatsApp-assisted and manual order flows may be available for
          some transactions. Payment must be authorised before order release unless another arrangement is clearly confirmed.
        </p>
      </Section>

      <Section title="Delivery and service area">
        <p>
          Delivery estimates are not guarantees. Delays may occur because of traffic, weather, rider availability, load-shedding,
          verification checks, or vendor preparation time. Current operating focus includes {LEGAL_SERVICE_AREA}.
        </p>
      </Section>

      <Section title="Age-restricted products">
        <p>
          Alcohol and other restricted products may only be sold to customers who lawfully qualify to receive them. Customers
          must be 18 or older where alcohol is involved and may be asked for verification on delivery.
        </p>
      </Section>

      <Section title="Refunds, cancellations and complaints">
        <p>
          Refunds and cancellation outcomes depend on the order stage, payment status and issue reported. Please review the
          separate refund policy for more detail and contact support quickly when a problem occurs.
        </p>
      </Section>

      <Section title="Vendor and rider responsibility">
        <p>
          Vendors remain responsible for their menus, pricing, preparation, food quality, lawful trading status and product
          compliance. Riders and delivery partners remain responsible for lawful conduct, safe delivery behaviour and route
          handling.
        </p>
      </Section>

      <Section title="Intellectual property and website content">
        <p>
          The website design, content, logos, software, written material and brand elements remain owned by or licensed to
          {` ${LEGAL_COMPANY_NAME}`}. Users may not copy, republish or exploit site content without permission except as allowed by law.
        </p>
      </Section>

      <Section title="ECTA notice, liability and governing law">
        <p>
          These website terms form part of the site notice for purposes of South African electronic communications laws. To the
          extent permitted by law, platform liability is limited to direct losses reasonably linked to the service and excludes
          indirect or consequential loss. South African law governs these terms.
        </p>
      </Section>
    </LegalPageShell>
  );
}
