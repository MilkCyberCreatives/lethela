import type { Metadata } from "next";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";
import StructuredData from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about ordering, vendor onboarding, rider applications, delivery areas and support on Lethela.",
  alternates: {
    canonical: "/faq",
  },
};

const faq = [
  {
    q: "What can I order on Lethela?",
    a: "You can browse township favourites such as kota, chips, burgers, wings, braai, mogodu and breakfast items, plus groceries from approved participating vendors.",
  },
  {
    q: "How do vendors join Lethela?",
    a: "Vendors apply online, submit business details, trading location, category, operating hours and readiness information. Stores only go live after approval and commercial terms are confirmed.",
  },
  {
    q: "Can riders apply online?",
    a: "Yes. Riders can apply through the rider page and receive follow-up from operations after review.",
  },
  {
    q: "How do I track my order?",
    a: "After checkout you receive an order reference. Use it on the tracking page to see status updates and, where available, rider movement on the map preview.",
  },
  {
    q: "Which areas are currently served?",
    a: "Lethela is built for township delivery across South Africa. It is live in Klipfontein View first before expanding to more townships.",
  },
  {
    q: "How does Lethela handle alcohol?",
    a: "Liquor is a restricted 18+ category. It may only be sold by approved licensed vendors, and valid ID may be required on delivery.",
  },
  {
    q: "Are prices and delivery fees shown before I pay?",
    a: "Yes. Customers should see item prices, delivery fees and any manual-quote limits before completing checkout. Vendor commercial pricing is not public and is only available to approved vendors.",
  },
  {
    q: "What happens if something is missing or wrong?",
    a: "Contact support quickly with the order reference, phone number and photos if useful. Depending on the issue, Lethela may arrange a correction, replacement, credit, partial refund or full refund.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <StructuredData data={faqSchema} />
      <MainHeader />

      <section className="container py-10 md:py-14">
        <h1 className="text-3xl font-bold md:text-4xl">Frequently Asked Questions</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/75 md:text-base">
          Quick answers for customers, vendors and riders.
        </p>

        <div className="mt-8 grid gap-4">
          {faq.map((item) => (
            <article key={item.q} className="rounded-xl border border-white/15 bg-white/5 p-4">
              <h2 className="text-base font-semibold">{item.q}</h2>
              <p className="mt-2 text-sm text-white/80">{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
