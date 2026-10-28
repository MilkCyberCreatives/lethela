import { ChevronDown } from "lucide-react";
import StructuredData from "@/components/StructuredData";

type SignupFaqProps = {
  accountType: "vendor" | "rider";
};

// Answers the questions people search for before signing up. Keep every answer to confirmed
// facts, and keep Lethela's fee figures out: they are shown only after sign-in.
export const SIGNUP_FAQ = {
  rider: {
    title: "Questions riders ask",
    items: [
      {
        q: "How do I become a delivery rider with Lethela?",
        a: "Sign up with your name, WhatsApp number, email and a password. Then add how you deliver and your area, and accept the rider agreement in your rider dashboard. You are approved automatically once those are in. ID, vehicle papers and banking can be added later.",
      },
      {
        q: "How do Lethela riders get paid?",
        a: "Riders keep the full delivery fee for every delivery they complete, plus every tip. You see the delivery amounts after you sign in.",
      },
      {
        q: "Does it cost anything to register as a rider?",
        a: "No. Rider registration is free.",
      },
      {
        q: "Where do Lethela riders deliver?",
        a: "Lethela delivers in Klipfontein View, Midrand, and approves riders for the areas it serves.",
      },
    ],
  },
  vendor: {
    title: "Questions store owners ask",
    items: [
      {
        q: "How do I sell on Lethela?",
        a: "Sign up with your store name, WhatsApp number, email and a password. Then add your address, opening hours and at least one item with a price in your dashboard. Your store is approved automatically and goes live once those are in. Banking and documents can be added later.",
      },
      {
        q: "What can I sell on Lethela?",
        a: "Food such as kota, chicken, chips and braai, groceries and everyday essentials. Spaza shops, takeaways and grocery sellers can all join. Liquor can only be listed with a valid licence and Lethela approval.",
      },
      {
        q: "Do I need my own delivery drivers?",
        a: "No. Lethela runs the delivery with its own approved riders, so you only prepare the order.",
      },
      {
        q: "What does it cost to sell on Lethela?",
        a: "Creating your account is free. Lethela's fees are shown to you after you sign up.",
      },
      {
        q: "Which areas does Lethela serve?",
        a: "Lethela delivers in Klipfontein View, Midrand, and approves stores for the areas it serves.",
      },
    ],
  },
} as const;

export default function SignupFaq({ accountType }: SignupFaqProps) {
  const faq = SIGNUP_FAQ[accountType];
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section className="mt-3" aria-labelledby={`${accountType}-faq-title`}>
      <StructuredData data={schema} />
      <h2 id={`${accountType}-faq-title`} className="px-1 text-sm font-semibold text-slate-800">
        {faq.title}
      </h2>
      <div className="mt-2 grid gap-2">
        {faq.items.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border border-slate-200 text-slate-700 open:bg-slate-50/70"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="px-4 pb-4 pt-1 text-sm leading-6 text-slate-600">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
