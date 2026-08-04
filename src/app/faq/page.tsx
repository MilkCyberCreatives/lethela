import type { Metadata } from "next";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";
import StructuredData from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about ordering, vendor onboarding, rider applications, delivery areas, pricing and support on Lethela.",
  alternates: {
    canonical: "/faq",
  },
  openGraph: {
    title: "Frequently Asked Questions | Lethela",
    description:
      "Answers about Lethela ordering, road-distance delivery fees, vendor and rider onboarding, secure tracking and support.",
    url: "/faq",
  },
  twitter: {
    title: "Frequently Asked Questions | Lethela",
    description:
      "Answers about Lethela ordering, road-distance delivery fees, vendor and rider onboarding, secure tracking and support.",
  },
};

const faq = [
  {
    q: "What can I order on Lethela?",
    a: "When approved vendors are available in your area, you can browse township favourites such as kota, chips, burgers, wings, braai, mogodu and breakfast items, plus groceries from participating stores.",
  },
  {
    q: "How do vendors join Lethela?",
    a: "Vendors create a simple account, then complete business, location, operating-hours, banking, document and product details in the private dashboard. Stores only go live after approval and commercial terms are confirmed.",
  },
  {
    q: "Can riders apply online?",
    a: "Yes. Riders create a simple account, complete personal, vehicle, banking and document details in the private dashboard, and receive dispatch access only after Lethela approval.",
  },
  {
    q: "How do I track my order?",
    a: "Use the order reference and the phone number entered at checkout. Lethela then opens a signed tracking link so that a reference alone cannot reveal order, location or rider information.",
  },
  {
    q: "Which areas are currently served?",
    a: "Lethela starts with Klipfontein View. The marketplace clearly shows pre-launch, pilot or public-delivery status according to the approved vendors, products, riders and completed proof orders available in the area.",
  },
  {
    q: "How is the delivery fee calculated?",
    a: "Delivery is R10 per road kilometre, with a R10 minimum. The full delivery fee goes to the assigned rider. Google road routing is used where available, with a clearly labelled conservative estimate only as a fallback.",
  },
  {
    q: "How does Lethela handle alcohol?",
    a: "The Liquor category is restricted to customers aged 18 or older. Only approved vendors with a current licence may list liquor, checkout requires age confirmation, and the rider must verify acceptable ID or refuse delivery.",
  },
  {
    q: "Are prices and delivery fees shown before I pay?",
    a: "Yes. Customers see item prices, the calculated delivery fee, any rider tip and manual-quote limits before completing checkout. Public vendor and rider pilot pricing is also available on the Pricing page.",
  },
  {
    q: "What happens if something is missing or wrong?",
    a: "Open a support case quickly with the order reference, phone number and evidence link where useful. Depending on the issue, Lethela may arrange a correction, replacement, credit, partial refund or full refund.",
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
