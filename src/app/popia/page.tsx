import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { LEGAL_INFO_OFFICER_NAME, LEGAL_LAST_UPDATED, LEGAL_SUPPORT_EMAIL, LEGAL_WHATSAPP_LINK } from "@/lib/legal";

export const metadata: Metadata = {
  title: "POPIA Notice",
  description: "How Lethela handles data subject rights and personal information under POPIA.",
  alternates: {
    canonical: "/popia",
  },
};

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-7 text-white/72">
      {items.map((item) => (
        <li key={item} className="rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function PopiaPage() {
  return (
    <LegalPageShell
      title="POPIA Notice"
      intro="This notice explains the main data protection commitments Lethela applies under the Protection of Personal Information Act (POPIA)."
      note={<>Last updated: {LEGAL_LAST_UPDATED}. Use this page as the platform-facing POPIA summary for customers, vendors and riders.</>}
    >
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">How we process information</h2>
        <div className="mt-4">
          <BulletList
            items={[
              "We collect only information reasonably needed to run accounts, orders, onboarding, support, fraud prevention and platform operations.",
              "We aim to keep information accurate, relevant and secure.",
              "We limit access to personal information to authorised staff, providers and operating partners who need it.",
              "We take reasonable steps to investigate and respond to privacy incidents and security compromises.",
              "We keep records only for as long as lawful and operationally necessary.",
            ]}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">Your rights</h2>
        <div className="mt-4">
          <BulletList
            items={[
              "You may request access to personal information held about you.",
              "You may ask for incorrect information to be corrected.",
              "You may object to certain processing where POPIA allows it.",
              "You may request deletion where retention is no longer justified or where the law permits it.",
              "You may complain to the Information Regulator if you believe your information was processed unlawfully.",
            ]}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">Privacy contact</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-white/72">
          <p>Information Officer / privacy contact: {LEGAL_INFO_OFFICER_NAME}</p>
          {LEGAL_SUPPORT_EMAIL ? (
            <p>
              Email:{" "}
              <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`} className="underline">
                {LEGAL_SUPPORT_EMAIL}
              </a>
            </p>
          ) : null}
          <p>
            WhatsApp:{" "}
            <a href={LEGAL_WHATSAPP_LINK} target="_blank" rel="noreferrer" className="underline">
              Contact Lethela support
            </a>
          </p>
        </div>
      </section>
    </LegalPageShell>
  );
}
