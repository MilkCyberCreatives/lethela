import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Headphones,
  MapPin,
  ReceiptText,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Truck,
} from "lucide-react";
import MainHeader from "@/components/MainHeader";
import Hero from "@/components/Hero";
import CategoryCarousel from "@/components/CategoryCarousel";
import VendorCard from "@/components/VendorCard";
import Footer from "@/components/Footer";
import StructuredData from "@/components/StructuredData";
import { getDisplaySuburb } from "@/lib/location";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";
import { getHomeVendors } from "@/lib/home-data";
import type { Vendor } from "@/types";

export const metadata: Metadata = {
  title: "Lethela | Township Delivery South Africa",
  description:
    "Lethela is a township delivery marketplace for South Africa, now live in Klipfontein View. Order from approved local vendors, spaza shops, grocery sellers and restaurants near you.",
  keywords: [
    "Township delivery South Africa",
    "Spaza shop delivery",
    "Grocery delivery in townships",
    "Kota delivery near me",
    "Local food delivery township",
    "Become a township vendor",
    "Sell groceries online in South Africa",
    "Delivery platform for spaza shops",
  ],
  alternates: {
    canonical: "/",
  },
};

export const revalidate = 180;

const homeFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What can I order on Lethela?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can order food, groceries and daily essentials from approved local vendors, spaza shops and restaurants. Alcohol is temporarily hidden until licence and handover checks are complete.",
      },
    },
    {
      "@type": "Question",
      name: "Where is Lethela live?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lethela is now live in Klipfontein View and built for township delivery across South Africa.",
      },
    },
    {
      "@type": "Question",
      name: "Can vendors join Lethela?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Spaza shops, food vendors, grocery sellers, restaurants and riders can apply online and go live after approval.",
      },
    },
  ],
};

const homeWebPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `${SITE_NAME} Home`,
  url: absoluteUrl("/"),
  isPartOf: { "@id": `${SITE_URL}/#website` },
  about: ["Township delivery", "Food delivery", "Grocery delivery", "Spaza shop delivery"],
};

export default async function HomePage() {
  const address = await getDisplaySuburb();
  const vendors = await getHomeVendors(address, 6);

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <StructuredData data={homeFaqSchema} />
      <StructuredData data={homeWebPageSchema} />
      <MainHeader />

      <Hero
        initialArea={address}
        initialNearbyVendors={vendors.slice(0, 3).map((vendor) => ({
          id: vendor.id,
          name: vendor.name,
          slug: vendor.slug,
          cuisines: vendor.cuisines,
          eta: vendor.eta,
        }))}
      />

      <TrustStrip />
      <LiveNearYouSection vendors={vendors} area={address} />
      <SpazaGroceriesSection />

      <section className="container py-12">
        <CategoryCarousel />
      </section>

      <HowItWorksSection />
      <JoinLethelaSection />
      <Footer />
    </main>
  );
}

function TrustStrip() {
  const items = [
    ["Approved local vendors", ShieldCheck],
    ["Clear delivery fees", ReceiptText],
    ["WhatsApp support", Headphones],
    ["Built for township businesses", Store],
  ] as const;

  return (
    <section className="border-y border-white/10 bg-white/[0.035]">
      <div className="container grid gap-3 py-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([label, Icon]) => (
          <div key={label} className="flex items-center gap-3 text-sm text-white/78">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lethela-primary/12 text-lethela-primary">
              <Icon className="h-4 w-4" />
            </span>
            <span className="font-medium">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function LiveNearYouSection({ vendors, area }: { vendors: Vendor[]; area: string | null }) {
  return (
    <section id="live-near-you" className="container py-12">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold md:text-3xl">Live near you</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
            Approved vendors ready for customers
            {area ? ` in ${area}` : " in your selected area"}.
          </p>
        </div>
        <Link
          href="/search"
          className="inline-flex items-center rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-lethela-primary hover:text-lethela-primary"
        >
          Search marketplace
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      {vendors.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {vendors.slice(0, 6).map((vendor) => (
            <VendorCard key={vendor.id} v={vendor} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-semibold">We are still onboarding approved vendors here.</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
            Are you a spaza shop, food vendor or restaurant? Join Lethela today. We only show
            vendors with complete profiles, products, trading hours and approval.
          </p>
          <Link
            href="/vendors/register"
            className="mt-5 inline-flex rounded-md bg-lethela-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-lethela-primary/90"
          >
            Join as a vendor
          </Link>
        </div>
      )}
    </section>
  );
}

function SpazaGroceriesSection() {
  return (
    <section className="container py-12">
      <div className="grid gap-6 rounded-xl border border-white/10 bg-white/[0.04] p-6 md:p-8 lg:grid-cols-[1fr,0.85fr]">
        <div>
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-lethela-primary/12 text-lethela-primary">
            <ShoppingBasket className="h-6 w-6" />
          </span>
          <h2 className="mt-5 text-2xl font-semibold md:text-3xl">
            Spaza shops and groceries near you
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68 md:text-base">
            Get bread, milk, eggs, snacks, cold drinks and daily basics delivered from local shops.
          </p>
          <Link
            href="/categories/spaza-groceries"
            className="mt-6 inline-flex rounded-md bg-lethela-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-lethela-primary/90"
          >
            Browse groceries
          </Link>
        </div>
        <div className="grid content-start gap-3 sm:grid-cols-2">
          {["Bread", "Milk", "Eggs", "Snacks", "Cold drinks", "Daily basics"].map((item) => (
            <div key={item} className="rounded-lg border border-white/10 bg-[#080B27]/70 p-4">
              <p className="font-medium">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    ["Enter your location", MapPin],
    ["Choose a vendor", Store],
    ["Place your order", CheckCircle2],
    ["Track your delivery", Truck],
  ] as const;

  return (
    <section className="container py-12">
      <div className="mb-6 max-w-2xl">
        <h2 className="text-2xl font-semibold md:text-3xl">How Lethela works</h2>
        <p className="mt-2 text-sm leading-6 text-white/62">
          A simple ordering flow for township customers and local businesses.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([label, Icon], index) => (
          <article key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-lethela-primary/12 text-lethela-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-white/35">0{index + 1}</span>
            </div>
            <h3 className="mt-5 font-semibold">{label}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}

function JoinLethelaSection() {
  return (
    <section className="container pb-14 pt-8">
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-semibold">Become a vendor</h2>
          <p className="mt-3 text-sm leading-7 text-white/66">
            Spaza shops, food vendors, grocery sellers and restaurants can create a profile and
            complete approval from the dashboard.
          </p>
          <Link
            href="/vendors/register"
            className="mt-5 inline-flex rounded-md bg-lethela-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-lethela-primary/90"
          >
            Sell on Lethela
          </Link>
        </article>
        <article className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-semibold">Become a rider</h2>
          <p className="mt-3 text-sm leading-7 text-white/66">
            Local riders can apply to support township deliveries as Lethela expands area by area.
          </p>
          <Link
            href="/rider"
            className="mt-5 inline-flex rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-lethela-primary hover:text-lethela-primary"
          >
            Apply as a rider
          </Link>
        </article>
      </div>
    </section>
  );
}
