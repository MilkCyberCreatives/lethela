import type { Metadata } from "next";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";
import StructuredData from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "About Lethela",
  description:
    "Learn about Lethela's AI-supported delivery platform, vendor growth tools, rider onboarding, and customer ordering experience in South Africa.",
  alternates: {
    canonical: "/about",
  },
};

const aboutFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Where does Lethela operate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lethela is built for South African communities, with active focus on Midrand and township-first delivery use cases.",
      },
    },
    {
      "@type": "Question",
      name: "How does Lethela support vendors?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Vendors get onboarding, product upload tools, AI-generated descriptions, pricing support, order management and analytics.",
      },
    },
    {
      "@type": "Question",
      name: "How does Lethela support riders?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Riders can apply online, complete onboarding and use realtime order updates for smoother delivery operations.",
      },
    },
  ],
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <StructuredData data={aboutFaqSchema} />
      <MainHeader />

      <section className="bg-gradient-to-b from-black/80 via-[#0E1236]/60 to-lethela-secondary text-white">
        <div className="container max-w-3xl py-10 md:py-16">
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            About Lethela - <span className="text-lethela-primary">Siyashesha</span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-white/80 md:text-base">
            Lethela is a South African delivery and logistics platform built for speed, fairness, and local context.
            Phase 1 focuses on food delivery. Phase 2 expands to logistics, removals, convenience, and more.
          </p>

          <p className="mt-4 text-sm leading-relaxed text-white/80 md:text-base">
            Our stack is AI-native. Vendors can launch faster with generated menu descriptions, pricing suggestions,
            promo timing insights, and operations automation. Riders get smoother onboarding. Customers get better
            discovery and support.
          </p>

          <p className="mt-4 text-sm leading-relaxed text-white/80 md:text-base">
            Siyashesha means &quot;we are fast.&quot; That is our promise across onboarding, support, and delivery.
          </p>

          <div className="mt-8 text-xs text-white/60">
            Need help or want to partner with us? Message Lethela on WhatsApp:{" "}
            <a className="underline" href="https://wa.me/27723908919" target="_blank" rel="noreferrer">
              +27 72 390 8919
            </a>
          </div>
        </div>
      </section>

      <section className="surface-section border-t border-white/10">
        <div className="container max-w-3xl space-y-4 py-10 text-sm text-white/70">
          <div>
            <div className="mb-1 text-base font-semibold text-white">Vendors</div>
            <div>
              Menu management, operating hours, specials, driver tracking, and AI-assisted growth tools in one place.
            </div>
          </div>

          <div>
            <div className="mb-1 text-base font-semibold text-white">Riders</div>
            <div>Flexible hours, faster onboarding, and visibility into demand hotspots.</div>
          </div>

          <div>
            <div className="mb-1 text-base font-semibold text-white">Customers</div>
            <div>
              Search in plain language, get smarter recommendations, and track orders with less friction.
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
