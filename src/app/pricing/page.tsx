import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import { formatZAR } from "@/lib/format";
import { DELIVERY_FEE_TIERS, DELIVERY_PRICING_WORDING } from "@/lib/pricing";
import { requireVendor } from "@/lib/authz";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Lethela pricing for township delivery, local vendors, spaza shops and community riders across South Africa.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/pricing",
  },
};

const vendorPlans = [
  ["Starter Vendor", "R49/month + 5% per completed order, capped at R5"],
  ["Standard Vendor", "R99/month + 3% per completed order, capped at R3"],
  ["Growth Vendor", "R199/month + 0% commission"],
];

export default async function PricingPage() {
  try {
    await requireVendor("STAFF");
  } catch {
    redirect("/vendors/signin?next=/pricing");
  }

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />

      <section className="border-b border-white/10 bg-[#080B27]">
        <div className="container py-10 md:py-14">
          <p className="text-xs uppercase tracking-[0.16em] text-lethela-primary">
            Township pricing
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
            Simple pricing for township delivery, starting in Klipfontein View.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 md:text-base">
            {DELIVERY_PRICING_WORDING} We are live in Klipfontein View first, then expanding to more
            township communities across South Africa.
          </p>
        </div>
      </section>

      <section className="container grid gap-5 py-8 lg:grid-cols-[1fr,1fr]">
        <article className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-xl font-semibold">Customer delivery fees</h2>
          <div className="mt-4 grid gap-2">
            {DELIVERY_FEE_TIERS.map((tier) => (
              <div
                key={tier.label}
                className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm"
              >
                <span>{tier.label}</span>
                <span className="font-semibold text-lethela-primary">
                  {formatZAR(tier.feeCents)}
                </span>
              </div>
            ))}
            <div className="rounded-lg border border-amber-200/25 bg-amber-300/10 px-3 py-2 text-sm text-amber-50">
              Over 10 km: manual quote or unavailable during the current pilot zone.
            </div>
          </div>
        </article>

        <article className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-xl font-semibold">Vendor pilot offer</h2>
          <div className="mt-4 space-y-2 text-sm text-white/78">
            <p>First 50 vendors register for free.</p>
            <p>First month is free.</p>
            <p>July to September pilot fee: 5% per completed order, capped at R5 per order.</p>
            <p>No hidden charges. You stay in control of your prices.</p>
          </div>
          <h3 className="mt-5 text-sm font-semibold uppercase tracking-[0.12em] text-white/60">
            After pilot
          </h3>
          <div className="mt-3 grid gap-2">
            {vendorPlans.map(([name, fee]) => (
              <div key={name} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                <div className="font-semibold">{name}</div>
                <div className="mt-1 text-white/65">{fee}</div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-white/10 bg-white/[0.035] p-5 lg:col-span-2">
          <h2 className="text-xl font-semibold">Rider pilot payouts</h2>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            <p className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/78">
              Driver registration is free and there is no monthly driver fee.
            </p>
            <p className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/78">
              During the current pilot, drivers get 100% of the delivery fee.
            </p>
            <p className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/78">
              Drivers keep 100% of customer tips.
            </p>
            <p className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/78">
              Branded delivery bag deposit: R150 refundable, with pay-off support after earning.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/vendors/register"
              className="rounded-full bg-lethela-primary px-4 py-2 text-sm font-medium"
            >
              Apply as vendor
            </Link>
            <Link href="/rider" className="rounded-full border border-white/30 px-4 py-2 text-sm">
              Apply as rider
            </Link>
          </div>
        </article>
      </section>

      <Footer />
    </main>
  );
}
