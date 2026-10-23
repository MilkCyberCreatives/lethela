import type { Metadata } from "next";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";
import StructuredData from "@/components/StructuredData";
import { LEGAL_SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "What Lethela is, where it delivers, who delivers your order, how to track it, and how vendors and riders join. Quick answers about Lethela in Klipfontein View, Midrand.",
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
    q: "What is Lethela?",
    a: "Lethela is a South African delivery marketplace built for township businesses. You order food, groceries and everyday essentials from approved local stores, and Lethela riders bring the order to your door. Lethela is open in Klipfontein View, Midrand.",
  },
  {
    q: "Who delivers my order?",
    a: "Lethela runs the delivery. An approved Lethela rider collects your order from the store and brings it to your address, so stores do not need their own drivers.",
  },
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
    a: "Yes. Riders create a simple account, complete personal, vehicle, banking and document details in the private dashboard, and receive dispatch access only after Lethela approval. Rider registration is free.",
  },
  {
    q: "Do Lethela riders keep the delivery fee?",
    a: "Yes. Riders keep the full delivery fee for every delivery they complete, plus every tip.",
  },
  {
    q: "Can I pay cash on delivery?",
    a: "No. Every order is placed and paid online at checkout with Ozow instant EFT, so there is no cash to handle at the door. You do not need an account to order.",
  },
  {
    q: "How do I track my order?",
    a: "Use the order reference and the phone number entered at checkout. Lethela then opens a signed tracking link so that a reference alone cannot reveal order, location or rider information.",
  },
  {
    q: "Which areas are currently served?",
    a: "Lethela is open in Klipfontein View, Midrand. The homepage shows the approved stores that deliver to your area.",
  },
  {
    q: "Does Lethela deliver outside Klipfontein View?",
    a: "Not yet. Lethela delivers in Klipfontein View, Midrand, and plans to add more township areas over time.",
  },
  {
    q: "Is there a delivery app for townships?",
    a: "Yes. Lethela is a South African delivery app built for townships. It lists local kasi stores such as spaza shops, kota takeaways and grocery sellers, and Lethela riders deliver to your door. It is open in Klipfontein View, Midrand.",
  },
  {
    q: "What is a kota?",
    a: "A kota is a South African township favourite: a quarter loaf of bread, hollowed out and filled with chips and fillings such as polony, russian, cheese, egg, atchar and sauce. You can order kota from local stores on Lethela.",
  },
  {
    q: "How is the delivery fee calculated?",
    a: "Delivery is worked out from the road distance between the shop and your address, and you see the exact fee before you pay. The full delivery fee goes to the assigned rider. Google road routing is used where available, with a clearly labelled conservative estimate only as a fallback.",
  },
  {
    q: "How does Lethela handle alcohol?",
    a: "The Liquor category is restricted to customers aged 18 or older. Only approved vendors with a current licence may list liquor, checkout requires age confirmation, and the rider must verify acceptable ID or refuse delivery.",
  },
  {
    q: "Are prices and delivery fees shown before I pay?",
    a: "Yes. Customers see item prices, the calculated delivery fee, any rider tip and manual-quote limits before completing checkout. Once you sign in, you can also see the full vendor and rider pilot pricing on the Pricing page.",
  },
  {
    q: "What happens if something is missing or wrong?",
    a: "Open a support case quickly with the order reference, phone number and evidence link where useful. Depending on the issue, Lethela may arrange a correction, replacement, credit, partial refund or full refund.",
  },
  {
    q: "How do I contact Lethela?",
    a: `Use the Contact page or the WhatsApp button on the website${LEGAL_SUPPORT_EMAIL ? `, or email ${LEGAL_SUPPORT_EMAIL}` : ""}. Have your order reference ready if your question is about an order.`,
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
