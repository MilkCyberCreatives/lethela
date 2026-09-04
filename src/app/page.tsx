import { BellRing, CheckCircle2, Megaphone, MapPin, ShoppingBag, Store, Truck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CategoryCarousel from "@/components/CategoryCarousel";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import HomeProductCard from "@/components/HomeProductCard";
import MainHeader from "@/components/MainHeader";
import type { ProductLite } from "@/components/ProductCard";
import StructuredData from "@/components/StructuredData";
import VendorCard from "@/components/VendorCard";
import { getHomeProducts, getHomeVendors } from "@/lib/home-data";
import { getMarketplaceLaunchStatus } from "@/lib/launch-readiness";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";
import { buildLaunchNotificationLink } from "@/lib/support";
import type { Vendor } from "@/types";

const homeDescription =
  "Lethela is a township delivery marketplace for South Africa, launching from Klipfontein View with approved local vendors and community riders.";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Township Delivery South Africa",
    description: homeDescription,
    path: "/",
  }),
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
};

export const revalidate = 180;

const homeWebPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `${SITE_NAME} Home`,
  url: absoluteUrl("/"),
  isPartOf: { "@id": `${SITE_URL}/#website` },
  about: ["Township delivery", "Food delivery", "Grocery delivery", "Spaza shop delivery"],
};

const homeFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    [
      "What can I order on Lethela?",
      "KoTa, chicken, groceries and other products from approved local businesses.",
    ],
    [
      "How does delivery work?",
      "Share your location, choose a nearby vendor, checkout and track a community rider.",
    ],
    [
      "Can my business sell on Lethela?",
      "Yes. Apply as a vendor, add your products and submit your profile for approval.",
    ],
  ].map(([name, text]) => ({
    "@type": "Question",
    name,
    acceptedAnswer: { "@type": "Answer", text },
  })),
};

const groceryCategories = new Set(["Groceries", "Drinks", "Snacks"]);
const defaultArea = "Klipfontein View, Midrand 1685";

export default async function HomePage() {
  // Keep the public homepage eligible for ISR and Vercel's edge cache. Hero
  // restores the visitor's saved area in the browser, so reading the same
  // preference through a request-time server API here only made every response
  // private and forced a server round trip.
  const address = defaultArea;
  const [vendors, products] = await Promise.all([
    getHomeVendors(address, 6),
    getHomeProducts(address, 36),
  ]);

  const groceryProducts = products
    .filter((product) => groceryCategories.has(String(product.category)))
    .slice(0, 8);
  const kotaProducts = products.filter((product) => product.category === "Kota").slice(0, 8);
  const chickenProducts = products
    .filter((product) => product.category === "Chicken" || product.category === "Wings")
    .slice(0, 8);
  const featuredProductIds = new Set(
    [...kotaProducts, ...chickenProducts, ...groceryProducts].map((product) => product.id),
  );
  const recentProducts = products
    .filter((product) => !featuredProductIds.has(product.id))
    .slice(0, 8);
  const hasMarketplaceItems = vendors.length > 0 && products.length > 0;
  const launchStatus = getMarketplaceLaunchStatus({
    approvedVendorCount: vendors.length,
    publicProductCount: products.length,
  });

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <StructuredData data={homeWebPageSchema} />
      <StructuredData data={homeFaqSchema} />
      <MainHeader />

      <Hero initialArea={address} launchStatus={launchStatus} />

      <section className="container py-10">
        <CategoryCarousel />
      </section>

      {hasMarketplaceItems ? (
        <>
          <ProductRail
            title="KoTa favourites"
            subtitle="Loaded, local and made the way the kasi loves it."
            products={kotaProducts}
            href="/categories/kota"
          />
          <ProductRail
            title="Chicken that brings everyone together"
            subtitle="Grilled, crispy, saucy and ready for sharing."
            products={chickenProducts}
            href="/categories/chicken"
          />
          <ProductRail
            title="Groceries near you"
            subtitle="Bread, milk, eggs, snacks and daily basics."
            products={groceryProducts}
          />
          <VendorRail title="Vendors near you" vendors={vendors} />
          <ProductRail title="More local favourites" products={recentProducts} />
        </>
      ) : (
        <MarketplaceEmptyState area={address || "Klipfontein View"} />
      )}

      <HowItWorksStrip />
      <PromoteYourBusiness />
      <Footer />
    </main>
  );
}

function ProductRail({
  title,
  subtitle,
  products,
  href = "/search",
}: {
  title: string;
  subtitle?: string;
  products: ProductLite[];
  href?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="container py-8">
      <SectionHeader title={title} href={href} />
      {subtitle ? <p className="-mt-3 mb-5 text-sm text-white/62">{subtitle}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <HomeProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function VendorRail({ title, vendors }: { title: string; vendors: Vendor[] }) {
  if (vendors.length === 0) return null;

  return (
    <section id="vendors-near-you" className="container py-8">
      <SectionHeader title={title} href="/search" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vendors.map((vendor) => (
          <VendorCard key={vendor.id} v={vendor} />
        ))}
      </div>
    </section>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <Link
        href={href}
        className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-lethela-primary hover:text-lethela-primary"
      >
        Browse all
      </Link>
    </div>
  );
}

function MarketplaceEmptyState({ area }: { area: string }) {
  return (
    <section className="container py-10">
      <div className="rounded-xl border border-white/10 bg-white/[0.045] p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-lethela-primary/15 text-lethela-primary">
          <BellRing className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Ordering is launching shortly in this area.</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/64">
          We are approving the first stores, products and riders before accepting public orders.
          This protects customers and makes sure the first deliveries run smoothly.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a
            href={buildLaunchNotificationLink(area)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-md bg-lethela-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-lethela-primary/90"
          >
            Notify me when ordering opens
          </a>
          <Link
            href="/vendors/register"
            className="inline-flex rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-lethela-primary hover:text-lethela-primary"
          >
            Join as a vendor
          </Link>
          <Link
            href="/rider"
            className="inline-flex rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-lethela-primary hover:text-lethela-primary"
          >
            Join as a rider
          </Link>
        </div>
      </div>
    </section>
  );
}

function HowItWorksStrip() {
  const steps = [
    ["Enter your location", MapPin],
    ["Choose a vendor", Store],
    ["Place your order", ShoppingBag],
    ["Track your delivery", Truck],
  ] as const;

  return (
    <section className="container pb-12 pt-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">How Lethela works</h2>
        <Link href="/how-it-works" className="text-sm font-semibold text-white/70 hover:text-white">
          See every step
        </Link>
      </div>
      <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([label, Icon]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-lethela-primary/12 text-lethela-primary">
              {label === "Place your order" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </span>
            <span className="text-sm font-medium text-white/78">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PromoteYourBusiness() {
  return (
    <section className="container pb-14">
      <div className="relative min-h-[390px] overflow-hidden rounded-3xl border border-lethela-primary/45 bg-slate-950 shadow-2xl shadow-black/25 md:min-h-[430px]">
        <Image
          src="/ads/lethela-house-campaign.webp"
          alt="A Lethela rider delivering a KoTa and chicken order in the community"
          fill
          sizes="(max-width: 768px) 100vw, 1200px"
          className="object-cover object-[68%_center] md:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050a18] via-[#050a18]/90 to-[#050a18]/10" />
        <div className="relative z-10 flex min-h-[390px] max-w-2xl flex-col justify-center p-6 sm:p-9 md:min-h-[430px] md:p-12">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/80 backdrop-blur-sm">
            <Megaphone className="h-3.5 w-3.5" /> Lethela spotlight
          </span>
          <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight md:text-5xl">
            The kasi is cooking. We bring it to you.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-white/75 md:text-base">
            From a loaded KoTa to crispy chicken, discover local favourites and back the businesses
            that make your neighbourhood move.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/categories/kota"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-lethela-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-lethela-primary/25"
            >
              Find a KoTa near you
            </Link>
            <Link
              href="/contact?subject=promote"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/30 bg-black/15 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm"
            >
              Advertise here
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/50">
            This premium space is available to local brands.
          </p>
        </div>
      </div>
    </section>
  );
}
