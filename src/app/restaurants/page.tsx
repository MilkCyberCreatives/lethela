import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CheckCircle2, GitBranch, MapPinned, RefreshCw, Route } from "lucide-react";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";
import StructuredData from "@/components/StructuredData";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Restaurant and Franchise Delivery Integration | Lethela",
  description:
    "Lethela supports local restaurants, multi-branch food outlets and established brands with branch setup, menu sync, order routing, delivery zones and API-ready integrations.",
  alternates: {
    canonical: "/restaurants",
  },
};

const capabilities = [
  ["Branch-level setup", Building2],
  ["Menu sync", RefreshCw],
  ["Store availability", CheckCircle2],
  ["Order routing", Route],
  ["Product availability", CheckCircle2],
  ["Delivery zones", MapPinned],
  ["Franchise reporting", GitBranch],
  ["API integration support", RefreshCw],
] as const;

const pageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Restaurant and franchise delivery integration",
  url: absoluteUrl("/restaurants"),
  isPartOf: { "@id": `${SITE_URL}/#website` },
  about: ["Restaurant delivery", "Franchise delivery", "API integration"],
};

export default function RestaurantsPage() {
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <StructuredData data={pageSchema} />
      <MainHeader />

      <section className="border-b border-white/10 bg-[#080B27]">
        <div className="container py-12 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lethela-primary">
            Restaurant and franchise partners
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight md:text-5xl">
            Delivery infrastructure for restaurants that want to reach township customers.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/74 md:text-base">
            {SITE_NAME} supports local restaurants, multi-branch food outlets and established brands
            that want to reach township customers through direct listings or API-ready integrations.
            Larger restaurant groups can use Lethela for store-level setup, menu availability and
            order routing while township customers get a familiar local ordering experience.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/vendors/register"
              className="rounded-md bg-lethela-primary px-5 py-3 text-sm font-semibold text-white hover:bg-lethela-primary/90"
            >
              Start partner profile
            </Link>
            <Link
              href="/about"
              className="rounded-md border border-white/20 px-5 py-3 text-sm font-semibold hover:border-lethela-primary hover:text-lethela-primary"
            >
              Learn about Lethela
            </Link>
          </div>
        </div>
      </section>

      <section className="container py-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map(([label, Icon]) => (
            <article key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <Icon className="h-5 w-5 text-lethela-primary" />
              <h2 className="mt-3 text-base font-semibold">{label}</h2>
            </article>
          ))}
        </div>
        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-semibold">Built for growth, without overpromising</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/70">
            Lethela can support established restaurant types such as national fast-food brands,
            franchise outlets and multi-branch kitchens where there is official participation or a
            confirmed integration path. Public listings only appear after approval, store setup and
            product readiness checks.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
