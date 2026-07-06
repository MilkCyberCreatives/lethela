import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  Building2,
  CheckCircle2,
  Headphones,
  ReceiptText,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import MainHeader from "@/components/MainHeader";
import Hero from "@/components/Hero";
import SmartBanner from "@/components/SmartBanner";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import CategoryCarousel from "@/components/CategoryCarousel";
import VendorGrid from "@/components/VendorGrid";
import ProductsGrid from "@/components/ProductsGrid";
import RecommendationsGrid from "@/components/RecommendationsGrid";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import FloatingWidgets from "@/components/FloatingWidgets";
import StructuredData from "@/components/StructuredData";
import { getDisplaySuburb } from "@/lib/location";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";
import { getHomeProducts, getHomeRecommendations, getHomeVendors } from "@/lib/home-data";

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
        text: "You can order township favourites like kota, chips, burgers, chicken, braai, breakfast items and groceries from approved local vendors. Alcohol is temporarily hidden until licence and handover checks are complete.",
      },
    },
    {
      "@type": "Question",
      name: "Does Lethela support vendor onboarding?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Vendors can apply online and are approved by admin before their stores go live.",
      },
    },
    {
      "@type": "Question",
      name: "Can I track my order in real time?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Lethela supports realtime order status updates and rider location tracking.",
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
  about: ["Food delivery", "Grocery delivery", "Township delivery"],
};

export default async function HomePage() {
  const address = await getDisplaySuburb();
  const [recommendations, products, vendors] = await Promise.all([
    getHomeRecommendations(address),
    getHomeProducts(address, 24),
    getHomeVendors(address, 18),
  ]);
  const featuredVendors = vendors.slice(0, 5).map((vendor) => ({
    name: vendor.name,
    img: vendor.cover,
    cta: `/vendors/${vendor.slug}`,
    sub: `${vendor.cuisines[0] || "Delivery"} - ${vendor.eta}`,
  }));
  const hasLiveVendors = vendors.length > 0;

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

      <ScrollReveal delay={40}>
        <SmartBanner />
      </ScrollReveal>

      {!hasLiveVendors ? (
        <ScrollReveal delay={70}>
          <MarketplaceEmptyState area={address} />
        </ScrollReveal>
      ) : null}

      {featuredVendors.length > 0 ? (
        <ScrollReveal delay={80}>
          <section className="container py-10">
            <FeaturedCarousel
              title="Order from approved township vendors near you"
              items={featuredVendors}
              autoMs={4000}
            />
          </section>
        </ScrollReveal>
      ) : null}

      <ScrollReveal delay={120}>
        <section className="container py-10">
          <CategoryCarousel />
        </section>
      </ScrollReveal>

      {hasLiveVendors ? (
        <>
          <ScrollReveal delay={140}>
            <RecommendationsGrid suburb={address} initialCards={recommendations} />
          </ScrollReveal>

          <ScrollReveal delay={160}>
            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductsGrid suburb={address} initialItems={products} />
            </Suspense>
          </ScrollReveal>

          <ScrollReveal delay={190}>
            <VendorGrid suburb={address} initialVendors={vendors} />
          </ScrollReveal>
        </>
      ) : null}

      <ScrollReveal delay={210}>
        <SpazaGrowthSection />
      </ScrollReveal>

      <ScrollReveal delay={230}>
        <TrustAndRestaurantSections />
      </ScrollReveal>

      <Footer />

      <FloatingWidgets />
    </main>
  );
}

function MarketplaceEmptyState({ area }: { area: string | null }) {
  return (
    <section className="container py-8">
      <div className="rounded-xl border border-white/12 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lethela-primary">
          {area ? `${area} marketplace` : "Township marketplace"}
        </p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold md:text-3xl">
          We are still onboarding approved vendors in your area.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/72 md:text-base">
          Are you a spaza shop, food vendor or restaurant? Join Lethela today. We only show vendors
          with complete profiles, products, trading hours and approval, so customers can order with
          confidence.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/vendors/register"
            className="rounded-md bg-lethela-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-lethela-primary/90"
          >
            Join as a vendor
          </Link>
          <Link
            href="/about"
            className="rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-lethela-primary hover:text-lethela-primary"
          >
            Learn about Lethela
          </Link>
        </div>
      </div>
    </section>
  );
}

const SPAZA_SUBCATEGORIES = [
  "Bread & bakery",
  "Milk & dairy",
  "Eggs",
  "Maize meal",
  "Rice & pasta",
  "Cooking oil",
  "Sugar & tea",
  "Snacks",
  "Cold drinks",
  "Cleaning products",
  "Toiletries",
  "Baby essentials",
  "Household basics",
];

function SpazaGrowthSection() {
  return (
    <section className="container py-10">
      <div className="grid gap-5 rounded-xl border border-white/10 bg-white/[0.04] p-6 md:p-8 lg:grid-cols-[0.85fr,1.15fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lethela-primary">
            Spaza shops and groceries
          </p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
            Own a spaza shop? List your groceries on Lethela and sell to customers nearby.
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/70">
            Lethela is simple enough for daily essentials and flexible enough for growing grocery
            stores. Add staple products, keep stock current and serve nearby customers without a
            complicated setup.
          </p>
          <Link
            href="/categories/spaza-groceries"
            className="mt-5 inline-flex rounded-md border border-white/20 px-4 py-2 text-sm font-semibold transition hover:border-lethela-primary hover:text-lethela-primary"
          >
            Browse Spaza & Groceries
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SPAZA_SUBCATEGORIES.map((item) => (
            <div key={item} className="rounded-lg border border-white/10 bg-[#080B27]/70 px-3 py-3">
              <p className="text-sm font-medium text-white/82">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustAndRestaurantSections() {
  const customerTrust = [
    ["Approved vendors only", ShieldCheck],
    ["Clear delivery fees", ReceiptText],
    ["WhatsApp support", Headphones],
    ["Local riders", Truck],
    ["Order references", CheckCircle2],
    ["Refund support", ReceiptText],
    ["Built for township businesses", Store],
  ] as const;
  const vendorTrust = [
    "Simple onboarding",
    "Spaza shop friendly",
    "Product/menu tools",
    "Dashboard checklist",
    "Approval before going live",
    "Future API support for established brands",
  ];
  const restaurantCapabilities = [
    "Branch-level setup",
    "Menu sync",
    "Store availability",
    "Order routing",
    "Product availability",
    "Delivery zones",
    "Franchise reporting",
    "API integration support",
  ];

  return (
    <section className="container grid gap-5 py-10 xl:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-2xl font-semibold">Why township customers trust Lethela</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {customerTrust.map(([label, Icon]) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#080B27]/70 p-3"
            >
              <Icon className="h-5 w-5 text-lethela-primary" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-2xl font-semibold">Why vendors choose Lethela</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {vendorTrust.map((label) => (
            <div
              key={label}
              className="rounded-lg border border-white/10 bg-[#080B27]/70 p-3 text-sm font-medium"
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 xl:col-span-2">
        <div className="grid gap-5 lg:grid-cols-[0.9fr,1.1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-lethela-primary" />
              <h2 className="text-2xl font-semibold">Restaurants and franchise-ready brands</h2>
            </div>
            <p className="mt-3 text-sm leading-7 text-white/70">
              Lethela supports local restaurants, multi-branch food outlets and established brands
              that want to reach township customers through direct listings or API-ready
              integrations.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {restaurantCapabilities.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-white/10 bg-[#080B27]/70 p-3 text-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductGridSkeleton() {
  return (
    <section className="container py-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-64 rounded-2xl bg-white/10" />
        ))}
      </div>
    </section>
  );
}
