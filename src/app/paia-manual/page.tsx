import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { LEGAL_INFO_OFFICER_NAME, LEGAL_LAST_UPDATED, LEGAL_SUPPORT_EMAIL, LEGAL_WHATSAPP_LINK } from "@/lib/legal";

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
          Last updated: {LEGAL_LAST_UPDATED}. This is a practical access guide for the live platform. Before full commercial
          launch, you should still finalise and publish a formal private-body PAIA manual containing the registered entity
          details and prescribed record categories.
        </>
      }
    >
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-white/72">
        <h2 className="text-lg font-semibold text-white">How to make a request</h2>
        <div className="mt-3 space-y-3">
          <p>Send a written request describing the record you need, why you need it, and how we can contact you.</p>
          <p>Include your full name, contact number, email address if available, and enough detail for us to identify the record.</p>
          <p>
            Address requests to the Information Officer / PAIA contact: {LEGAL_INFO_OFFICER_NAME}
            {LEGAL_SUPPORT_EMAIL ? (
              <>
                {" "}
                via <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`} className="underline">{LEGAL_SUPPORT_EMAIL}</a>
              </>
            ) : null}
            {" "}
            or <a href={LEGAL_WHATSAPP_LINK} target="_blank" rel="noreferrer" className="underline">WhatsApp support</a>.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-white/72">
        <h2 className="text-lg font-semibold text-white">Important notes</h2>
        <div className="mt-3 space-y-3">
          <p>Access may be granted, partially granted, refused, or delayed where the law allows or requires that outcome.</p>
          <p>Some records may contain third-party information, legally privileged material, security-sensitive information, or internal records that cannot be disclosed.</p>
          <p>Where applicable, requesters may need to complete a prescribed form or provide identity confirmation before access is given.</p>
        </div>
      </section>
    </LegalPageShell>
  );
}
