import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";
import {
  LEGAL_INFO_OFFICER_NAME,
  LEGAL_LAST_UPDATED,
  LEGAL_SUPPORT_EMAIL,
  LEGAL_WHATSAPP_LINK,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "PAIA Access Guide",
  description: "How to request access to records from Lethela under PAIA.",
  alternates: {
    canonical: "/paia-manual",
  },
};

export default function PaiaManualPage() {
  return (
    <LegalPageShell
      title="PAIA Access Guide"
      intro="This page explains how customers, vendors and third parties can request access to records that Lethela may hold, subject to the Promotion of Access to Information Act (PAIA)."
      note={
        <>
          Last updated: {LEGAL_LAST_UPDATED}. This is a practical access guide for the live
          platform. Formal private-body PAIA details are maintained with the platform owner,
          information officer and support contacts published in the legal pages.
        </>
      }
    >
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-white/72">
        <h2 className="text-lg font-semibold text-white">How to make a request</h2>
        <div className="mt-3 space-y-3">
          <p>
            Send a written request describing the record you need, why you need it, and how we can
            contact you.
          </p>
          <p>
            Include your full name, contact number, email address if available, and enough detail
            for us to identify the record.
          </p>
          <p>
            Address requests to the Information Officer / PAIA contact: {LEGAL_INFO_OFFICER_NAME}
            {LEGAL_SUPPORT_EMAIL ? (
              <>
                {" "}
                via{" "}
                <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`} className="underline">
                  {LEGAL_SUPPORT_EMAIL}
                </a>
              </>
            ) : null}{" "}
            or{" "}
            <a href={LEGAL_WHATSAPP_LINK} target="_blank" rel="noreferrer" className="underline">
              WhatsApp support
            </a>
            .
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-white/72">
        <h2 className="text-lg font-semibold text-white">Records that may exist</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {[
            "Customer account, support and order records",
            "Vendor application, menu, payout and operations records",
            "Rider application, delivery and support records",
            "Payment references, reconciliation notes and refund records",
            "Website, security, incident and system logs",
            "Company, tax, contract and supplier administration records",
          ].map((item) => (
            <div key={item} className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-white/72">
        <h2 className="text-lg font-semibold text-white">Important notes</h2>
        <div className="mt-3 space-y-3">
          <p>
            Access may be granted, partially granted, refused, or delayed where the law allows or
            requires that outcome.
          </p>
          <p>
            Some records may contain third-party information, legally privileged material,
            security-sensitive information, or internal records that cannot be disclosed.
          </p>
          <p>
            Where applicable, requesters may need to complete a prescribed form or provide identity
            confirmation before access is given.
          </p>
          <p>
            Fees, time periods and refusal grounds may apply under PAIA. If the requested record is
            mainly personal information about you, POPIA access rights may also be relevant.
          </p>
        </div>
      </section>
    </LegalPageShell>
  );
}
