import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import VendorSignupForm from "@/components/VendorSignupForm";

export const metadata: Metadata = {
  title: "Become a Vendor",
  description:
    "Apply to become a Lethela vendor. Submit your business details, menu readiness and compliance documents for admin approval.",
  alternates: {
    canonical: "/vendors/register",
  },
};

const STEPS = [
  {
    title: "Submit profile",
    text: "Provide business and operations details in one application.",
  },
  {
    title: "Admin review",
    text: "We validate store information, compliance docs, and area coverage.",
  },
  {
    title: "Go live fast",
    text: "Once approved, upload products and start receiving orders immediately.",
  },
];

const CHECKLIST = [
  "Business name, phone, and operating address",
  "Delivery fee and average prep ETA defaults",
  "Cuisine categories for search discovery",
  "Optional compliance links (ID and proof of address)",
];

export default function VendorRegisterPage() {
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />

      <section className="border-b border-white/10 bg-gradient-to-b from-black/80 via-[#0E1236]/60 to-lethela-secondary">
        <div className="container grid gap-8 py-10 md:grid-cols-[1.2fr,1fr] md:py-14">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/65">Vendor onboarding</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
              Become a Vendor - <span className="text-lethela-primary">Approval First</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-white/80 md:text-base">
              Set up your store once with complete details. Your store appears publicly only after admin approval, then
              your dashboard unlocks menu, orders, and AI tools.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <article key={step.title} className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="text-xs font-semibold text-lethela-primary">Step {index + 1}</p>
                  <h2 className="mt-1 text-sm font-semibold">{step.title}</h2>
                  <p className="mt-1 text-xs text-white/70">{step.text}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-white/15 bg-white/5 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Before you apply</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              {CHECKLIST.map((item) => (
                <li key={item} className="rounded-lg border border-white/10 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-white/60">
              Need help preparing documents or onboarding? WhatsApp support:{" "}
              <a className="underline" href="https://wa.me/27723908919" target="_blank" rel="noreferrer">
                +27 72 390 8919
              </a>
            </p>
            <p className="mt-2 text-xs text-white/60">
              Already have a vendor account?{" "}
              <Link className="underline" href="/vendors/signin">
                Sign in here
              </Link>
              .
            </p>
          </aside>
        </div>
      </section>

      <section className="surface-section">
        <div className="container py-10">
          <VendorSignupForm />
        </div>
      </section>

      <Footer />
    </main>
  );
}
