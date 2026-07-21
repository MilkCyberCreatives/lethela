import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { getLegalContactOptions } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Contact and Support",
  description: "Contact Lethela for order, account, vendor or rider support.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PageShell contentClassName="max-w-3xl">
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
    </PageShell>
  );
}
