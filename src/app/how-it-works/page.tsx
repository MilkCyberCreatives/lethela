import type { Metadata } from "next";
import Link from "next/link";
import { Check, MapPin, PackageCheck, ShoppingBag, Store, Truck } from "lucide-react";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import StructuredData from "@/components/StructuredData";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "How Lethela Works",
  description:
    "See how customers order, local vendors sell and community riders deliver with Lethela in four simple steps.",
  path: "/how-it-works",
});

const steps = [
  {
    title: "Share your location",
    text: "Use your current location or enter your area.",
    icon: MapPin,
  },
  {
    title: "Choose what you want",
    text: "Browse KoTa, chicken, groceries and more nearby.",
    icon: ShoppingBag,
  },
  {
    title: "Checkout simply",
    text: "Add your phone and delivery notes, then pay or use WhatsApp.",
    icon: PackageCheck,
  },
  {
    title: "Track the delivery",
    text: "A community rider collects and brings the order to you.",
    icon: Truck,
  },
] as const;

export default function HowItWorksPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to order with Lethela",
    description: "Order from a local township business and receive delivery in four simple steps.",
    totalTime: "PT30M",
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.text,
      url: `${absoluteUrl("/how-it-works")}#step-${index + 1}`,
    })),
  };

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <StructuredData data={schema} />
      <MainHeader />
      <section className="container py-10 md:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lethela-primary">
            Simple by design
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-6xl">
            From local shop to your door.
          </h1>
          <p className="mt-5 text-base leading-7 text-white/70 md:text-lg">
            Lethela keeps ordering short, supports local businesses and creates work for community
            riders.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                id={`step-${index + 1}`}
                key={step.title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
              >
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-lethela-primary text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                      Step {index + 1}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">{step.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/65">{step.text}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 text-slate-950 md:p-8">
            <Store className="h-7 w-7 text-lethela-primary" />
            <h2 className="mt-4 text-2xl font-bold">Sell where your customers already are</h2>
            <ul className="mt-4 grid gap-3 text-sm text-slate-600">
              {[
                "Create one business profile",
                "Add products and operating hours",
                "Receive and manage local orders",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/vendors/register"
              className="mt-6 inline-flex rounded-lg bg-lethela-primary px-5 py-3 text-sm font-semibold text-white"
            >
              Become a vendor
            </Link>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <Truck className="h-7 w-7 text-lethela-primary" />
            <h2 className="mt-4 text-2xl font-bold">Earn by delivering locally</h2>
            <p className="mt-3 text-sm leading-7 text-white/65">
              Approved riders see assigned deliveries, update progress and keep 100% of customer
              tips.
            </p>
            <Link
              href="/rider"
              className="mt-6 inline-flex rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white"
            >
              Become a rider
            </Link>
          </section>
        </div>
      </section>
      <Footer />
    </main>
  );
}
