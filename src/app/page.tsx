import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MapPin, ShoppingBag, Store, Truck } from "lucide-react";
import MainHeader from "@/components/MainHeader";
import Hero from "@/components/Hero";
import CategoryCarousel from "@/components/CategoryCarousel";
import VendorCard from "@/components/VendorCard";
import Footer from "@/components/Footer";
import HomeProductCard from "@/components/HomeProductCard";
import StructuredData from "@/components/StructuredData";
import type { ProductLite } from "@/components/ProductCard";
import { getDisplaySuburb } from "@/lib/location";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";
import { getHomeProducts, getHomeVendors } from "@/lib/home-data";
import type { Vendor } from "@/types";

export const metadata: Metadata = {
  title: "Lethela | Township Delivery South Africa",
  description:
    "Lethela is a township delivery marketplace for South Africa, now live in Klipfontein View. Order food, groceries and daily essentials from approved local vendors near you.",
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

const homeWebPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `${SITE_NAME} Home`,
  url: absoluteUrl("/"),
  isPartOf: { "@id": `${SITE_URL}/#website` },
  about: ["Township delivery", "Food delivery", "Grocery delivery", "Spaza shop delivery"],
};

const foodCategories = new Set(["Kota", "Chicken", "Burger", "Braai", "Breakfast", "Wings"]);
const groceryCategories = new Set(["Groceries", "Drinks", "Snacks"]);

export default async function HomePage() {
  const address = await getDisplaySuburb();
  const [vendors, products] = await Promise.all([
    getHomeVendors(address, 6),
    getHomeProducts(address, 36),
  ]);

  const groceryProducts = products
    .filter((product) => groceryCategories.has(String(product.category)))
    .slice(0, 8);
  const popularFood = products
    .filter((product) => foodCategories.has(String(product.category)))
    .slice(0, 8);
  const recentProducts = products.slice(0, 8);
  const hasMarketplaceItems = vendors.length > 0 || products.length > 0;

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
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

      <section className="container py-10">
        <CategoryCarousel />
      </section>

      {hasMarketplaceItems ? (
        <>
          <ProductRail
            title="Groceries near you"
            subtitle="Bread, milk, eggs, snacks and daily basics."
            products={groceryProducts}
          />
          <ProductRail title="Popular food" products={popularFood} />
          <VendorRail title="Vendors near you" vendors={vendors} />
          <ProductRail title="Recently added products" products={recentProducts} />
        </>
      ) : (
        <MarketplaceEmptyState />
      )}

      <HowItWorksStrip />
      <Footer />
    </main>
  );
}

function ProductRail({
  title,
  subtitle,
  products,
}: {
  title: string;
  subtitle?: string;
  products: ProductLite[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="container py-8">
      <SectionHeader title={title} href="/search" />
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

function MarketplaceEmptyState() {
  return (
    <section className="container py-10">
      <div className="rounded-xl border border-white/10 bg-white/[0.045] p-6 text-center">
        <h2 className="text-xl font-semibold">No approved vendors are live in this area yet.</h2>
        <p className="mt-2 text-sm text-white/64">Check again soon or browse another area.</p>
        <Link
          href="/vendors/register"
          className="mt-5 inline-flex rounded-md bg-lethela-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-lethela-primary/90"
        >
          Own a shop or restaurant? Join Lethela.
        </Link>
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
