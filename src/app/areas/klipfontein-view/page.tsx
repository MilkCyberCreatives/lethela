import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import StructuredData from "@/components/StructuredData";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

const areaName = "Klipfontein View, Midrand";
const description =
  "Discover Lethela delivery coverage, approved local vendors and marketplace onboarding for Klipfontein View in Midrand.";

export const metadata: Metadata = buildPageMetadata({
  title: "Klipfontein View Delivery",
  description,
  path: "/areas/klipfontein-view",
});

const launchMode = process.env.NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE || "prelaunch";
const isOrderingOpen = launchMode === "pilot" || launchMode === "public";

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: `${SITE_NAME} delivery in ${areaName}`,
      url: absoluteUrl("/areas/klipfontein-view"),
      description,
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
    {
      "@type": "Service",
      name: `${SITE_NAME} local marketplace and delivery service`,
      provider: { "@id": `${SITE_URL}/#organization` },
      areaServed: {
        "@type": "Place",
        name: areaName,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Midrand",
          addressRegion: "Gauteng",
          addressCountry: "ZA",
        },
      },
      serviceType: "Food and grocery marketplace delivery",
      url: absoluteUrl("/areas/klipfontein-view"),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        {
          "@type": "ListItem",
          position: 2,
          name: "Klipfontein View",
          item: absoluteUrl("/areas/klipfontein-view"),
        },
      ],
    },
  ],
};

export default function KlipfonteinViewAreaPage() {
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <StructuredData data={schema} />
      <MainHeader />

      <section className="border-b border-white/10 bg-black/20">
        <div className="container py-10 sm:py-12 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lethela-primary">
            Starting in Midrand
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            Local delivery for Klipfontein View
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/75 sm:text-base">
            Lethela connects residents with approved local food businesses, grocery stores, spaza
            shops and community riders. Listings only appear after operational and safety checks are
            complete.
          </p>
          <div className="mt-6 rounded-xl border border-white/12 bg-white/[0.045] p-4 text-sm leading-6 text-white/75">
            {isOrderingOpen
              ? "Ordering is open for approved listings currently available in the area."
              : "The Klipfontein View marketplace is being prepared. Vendor and rider onboarding is open while approved listings are added."}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/search"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-lethela-primary px-5 py-3 text-sm font-semibold text-white"
            >
              Browse available listings
            </Link>
            <Link
              href="/vendors/register"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/25 px-5 py-3 text-sm font-semibold"
            >
              Register a local business
            </Link>
            <Link
              href="/rider"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/25 px-5 py-3 text-sm font-semibold"
            >
              Apply as a rider
            </Link>
          </div>
        </div>
      </section>

      <section className="container py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [
              "Approved local businesses",
              "Stores and products remain hidden until Lethela readiness checks are complete.",
            ],
            [
              "Clear delivery pricing",
              "Delivery starts from R10 and is calculated according to the delivery distance.",
            ],
            [
              "Community rider network",
              "Delivery fees and customer tips are allocated to the assigned rider.",
            ],
          ].map(([title, copy]) => (
            <article key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/68">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
