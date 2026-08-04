import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SupportCaseForm from "@/components/SupportCaseForm";
import { getLegalContactOptions } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Contact and Support",
  description: "Contact Lethela for order, account, vendor or rider support.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact and Support | Lethela",
    description: "Open a support case for an order, payment, refund, account, vendor or rider issue.",
    url: "/contact",
  },
  twitter: {
    title: "Contact and Support | Lethela",
    description: "Open a support case for an order, payment, refund, account, vendor or rider issue.",
  },
};

const responseTargets = [
  ["Active delivery issue", "5-10 minutes during operating hours"],
  ["Payment or refund issue", "Within 30 minutes during operating hours"],
  ["Vendor or rider onboarding", "Within one business day"],
  ["General enquiry", "Within one to two business days"],
] as const;

export default function ContactPage() {
  return (
    <PageShell contentClassName="max-w-4xl">
      <p className="text-xs uppercase tracking-[0.16em] text-white/55">Help centre</p>
      <h1 className="mt-2 text-3xl font-bold md:text-4xl">Contact Lethela</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">
        For the fastest help, include your order reference and a short description. Never send a
        password, bank PIN, one-time PIN or full identity number.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {getLegalContactOptions().map((option) => (
          <a
            key={option.href}
            href={option.href}
            className="rounded-2xl border border-white/12 bg-white/[0.04] p-5 transition-colors hover:border-lethela-primary"
          >
            <span className="text-sm font-semibold text-white">{option.label}</span>
            <span className="mt-2 block text-xs text-white/55">Open support channel</span>
          </a>
        ))}
      </div>

      <SupportCaseForm />

      <section className="mt-8 rounded-2xl border border-white/12 bg-white/[0.03] p-5">
        <h2 className="text-lg font-semibold">Target response times</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {responseTargets.map(([issue, target]) => (
            <div key={issue} className="rounded-lg border border-white/10 px-3 py-3 text-sm">
              <div className="font-semibold text-white">{issue}</div>
              <div className="mt-1 text-xs text-white/58">{target}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-white/52">
          These are service targets, not guarantees. Safety emergencies must be reported to the
          appropriate emergency service first.
        </p>
      </section>
    </PageShell>
  );
}
