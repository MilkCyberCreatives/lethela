import { CheckCircle2, Megaphone, MapPin, ShoppingBag, Store, Truck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import BringLethelaForm from "@/components/BringLethelaForm";
import CategoryCarousel from "@/components/CategoryCarousel";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import HomeProductCard from "@/components/HomeProductCard";
import MainHeader from "@/components/MainHeader";
import type { ProductLite } from "@/components/ProductCard";
import StructuredData from "@/components/StructuredData";
import VendorCard from "@/components/VendorCard";
import {
  getHomeProducts,
  getHomeVendors,
  getJoiningStores,
  type JoiningStore,
} from "@/lib/home-data";
import { getMarketplaceLaunchStatus } from "@/lib/launch-readiness";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";
import type { Vendor } from "@/types";

const homeDescription =
  "Lethela is a South African township delivery app. Order kota, chicken, groceries and spaza essentials from local stores, delivered by Lethela riders. Lethela is open in Klipfontein View, Midrand.";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Township food and grocery delivery in Midrand",
    description: homeDescription,
    path: "/",
  }),
  // The root layout's "%s | Lethela" template does not apply to the homepage itself.
  title: { absolute: "Lethela | Township delivery app for kota, food and groceries" },
  keywords: [
    "township delivery app",
    "township delivery South Africa",
    "kasi food delivery",
    "kota delivery near me",
    "spaza shop delivery",
    "grocery delivery in townships",
    "food delivery Midrand",
    "Klipfontein View delivery",
    "sell food online South Africa",
    "delivery rider jobs South Africa",
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

const groceryCategories = new Set(["Groceries", "Drinks", "Snacks"]);
const defaultArea = "Klipfontein View, Midrand 1685";

export default async function HomePage() {
  // Keep the public homepage eligible for ISR and Vercel's edge cache. Hero
  // restores the visitor's saved area in the browser, so reading the same
  // preference through a request-time server API here only made every response
  // private and forced a server round trip.
  const address = defaultArea;
  // Lethela delivers in one pilot zone, so every approved store is listed. Matching the area
  // text here hid approved stores that typed their area differently ("Klipfontein", "Midrand");
  // checkout still refuses addresses outside the delivery distance.
  const [vendors, products] = await Promise.all([
    getHomeVendors(null, 6),
    getHomeProducts(null, 36),
  ]);
  const joiningStores = await getJoiningStores(vendors.map((vendor) => vendor.id));

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
  // A store is only listed when customers can order from it (an approved product or a published
  // menu item), so one listed store is enough. A store with only a menu has no product rails.
  const hasMarketplaceItems = vendors.length > 0;
  const launchStatus = getMarketplaceLaunchStatus({
    approvedVendorCount: vendors.length,
    publicProductCount: products.length,
  });

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <StructuredData data={homeWebPageSchema} />
      <MainHeader />

      <Hero initialArea={address} launchStatus={launchStatus} />

      <section className="container py-10">
        <CategoryCarousel />
      </section>

      {hasMarketplaceItems ? (
        <>
          <ProductRail
            eyebrow="KoTa"
            title="KoTa favourites"
            subtitle="Loaded, local and made the way the kasi loves it."
            products={kotaProducts}
            href="/categories/kota"
          />
          <ProductRail
            eyebrow="Chicken"
            title="Chicken that brings everyone together"
            subtitle="Grilled, crispy, saucy and ready for sharing."
            products={chickenProducts}
            href="/categories/chicken"
          />
          <ProductRail
            eyebrow="Groceries"
            title="Groceries near you"
            subtitle="Bread, milk, eggs, snacks and daily basics."
            products={groceryProducts}
          />
          <VendorRail title="Vendors near you" vendors={vendors} />
          <ProductRail eyebrow="More" title="More local favourites" products={recentProducts} />
        </>
      ) : (
        <MarketplaceEmptyState area="Klipfontein View" />
      )}

      <JoiningStoresRail stores={joiningStores} />

      <HowItWorksStrip />
      <BringLethelaForm />
      <PromoteYourBusiness />
      <Footer />
    </main>
  );
}

function ProductRail({
  eyebrow,
  title,
  subtitle,
  products,
  href = "/search",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  products: ProductLite[];
  href?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="container py-8">
      <SectionHeader eyebrow={eyebrow} title={title} href={href} />
      {subtitle ? <p className="-mt-3 mb-5 text-sm text-white/62">{subtitle}</p> : null}
      <div className="no-scrollbar -mx-4 grid snap-x snap-mandatory grid-flow-col auto-cols-[82%] gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:mx-0 sm:scroll-px-0 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
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
      <SectionHeader eyebrow="Order now" title={title} href="/search" />
      <div className="no-scrollbar -mx-4 grid snap-x snap-mandatory grid-flow-col auto-cols-[88%] gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 md:mx-0 md:scroll-px-0 md:grid-flow-row md:auto-cols-auto md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-3">
        {vendors.map((vendor) => (
          <VendorCard key={vendor.id} v={vendor} />
        ))}
      </div>
    </section>
  );
}

function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-lethela-primary-bright">
      {children}
    </p>
  );
}

function SectionHeader({
  eyebrow,
  title,
  href,
}: {
  eyebrow?: string;
  title: string;
  href: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3 sm:items-end sm:gap-4">
      <div className="min-w-0">
        {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
        <h2 className="text-xl font-semibold leading-tight sm:text-2xl">{title}</h2>
      </div>
      <Link
        href={href}
        className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-lethela-primary hover:text-lethela-primary"
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
          <Store className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Stores are adding their menus.</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/64">
          Lethela is open in {area}. Orders are placed and paid online, and a Lethela rider brings
          them to your door. Stores show here as soon as their menu is up.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
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

function JoiningStoresRail({ stores }: { stores: JoiningStore[] }) {
  if (stores.length === 0) return null;

  return (
    <section id="stores-on-lethela" className="container py-8">
      <SectionEyebrow>Joining now</SectionEyebrow>
      <h2 className="text-xl font-semibold leading-tight sm:text-2xl">Stores on Lethela</h2>
      <p className="mb-5 mt-2 text-sm text-white/62">
        These stores are putting their menus online. You can order and pay online as soon as their
        menu is up.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <div
            key={store.id}
            className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-lethela-primary/12 text-lethela-primary">
                <Store className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold">{store.name}</h3>
                <p className="truncate text-sm text-white/62">
                  {[store.storeType || "Local store", store.area].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-white/60">
              Menu coming soon
            </span>
          </div>
        ))}
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
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <SectionEyebrow>Find it. Order it. Track it.</SectionEyebrow>
          <h2 className="text-2xl font-semibold">How Lethela works</h2>
        </div>
        <Link href="/how-it-works" className="text-sm font-semibold text-white/70 hover:text-white">
          See every step
        </Link>
      </div>
      <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([label, Icon], index) => (
          <div key={label} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="w-6 shrink-0 text-sm font-bold tabular-nums text-white/45"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
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
