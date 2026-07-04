import type { Metadata } from "next";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";
import StructuredData from "@/components/StructuredData";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

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
  const whatsappHref = `https://wa.me/${getOrderWhatsAppPhone()}`;
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
            Lethela is a South African delivery and logistics platform built for speed, fairness,
            and local context. Lethela is live in Klipfontein View first with prepared food,
            groceries and township essentials through approved local vendors before expanding to
            more township communities across South Africa.
          </p>

          <p className="mt-4 text-sm leading-relaxed text-white/80 md:text-base">
            Our stack is AI-native. Vendors can start selling faster with generated menu
            descriptions, pricing suggestions, promo timing insights, and operations automation.
            Riders get smoother onboarding. Customers get better discovery and support.
          </p>

          <p className="mt-4 text-sm leading-relaxed text-white/80 md:text-base">
            Siyashesha means &quot;we are fast.&quot; That is our promise across onboarding,
            support, and delivery. It also means we keep the journey practical: clear delivery fees,
            visible operating hours, approved vendors and fewer dead ends when a customer is ready
            to order.
          </p>

          <div className="mt-8 text-xs text-white/60">
            Need help or want to partner with us? Message Lethela on WhatsApp:{" "}
            <a className="underline" href={whatsappHref} target="_blank" rel="noreferrer">
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
              Menu management, operating hours, specials, stock status, driver tracking,
              customer-ready product writing and AI-assisted growth tools in one place. Approved
              vendors control their prices and receive clear commercial terms before going live.
            </div>
          </div>

          <div>
            <div className="mb-1 text-base font-semibold text-white">Riders</div>
            <div>
              Flexible delivery opportunities, faster onboarding, order references, route context
              and operational support for township-first delivery corridors.
            </div>
          </div>

          <div>
            <div className="mb-1 text-base font-semibold text-white">Customers</div>
            <div>
              Search in plain language, browse category-aware listings, get smarter recommendations,
              see delivery charges before checkout and track orders with less friction.
            </div>
          </div>

          <div>
            <div className="mb-1 text-base font-semibold text-white">Responsible operations</div>
            <div>
              Lethela operates with POPIA-aware privacy practices, PAIA access guidance,
              consumer-friendly refund handling and careful compliance checks before restricted
              categories are offered publicly.
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
