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
    a: "You can order local favourites like kota, chips, burgers, alcohol and groceries from approved vendors.",
  },
  {
    q: "How do vendors join Lethela?",
    a: "Vendors apply online, submit business details and are approved by admin before their stores go live.",
  },
  {
    q: "Can riders apply online?",
    a: "Yes. Riders can apply through the rider page and receive follow-up from operations after review.",
  },
  {
    q: "How do I track my order?",
    a: "After checkout you receive an order reference and can track live status updates on the tracking page.",
  },
  {
    q: "Which areas are currently served?",
    a: "Lethela is focused on South African local delivery corridors, including Midrand and nearby township communities.",
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
