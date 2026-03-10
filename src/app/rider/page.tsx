import type { Metadata } from "next";
import MainHeader from "@/components/MainHeader";
import RiderApplyForm from "@/components/RiderApplyForm";

export const metadata: Metadata = {
  title: "Become a Rider",
  description:
    "Apply as a Lethela rider and deliver food and groceries with realtime order flows and flexible delivery hours.",
  alternates: {
    canonical: "/rider",
  },
};

const REQUIREMENTS = [
  "Valid South African ID and deliverable license code",
  "Reliable transport (bike, scooter, or car)",
  "Smartphone with GPS and mobile data",
  "WhatsApp and bank account for communication and payouts",
];

const FLOW = [
  {
    title: "Apply",
    text: "Submit your identity, delivery area, and availability details.",
  },
  {
    title: "Ops review",
    text: "Team reviews your application and AI summary for readiness.",
  },
  {
    title: "Onboard",
    text: "Once approved, you receive rider instructions and first shift setup.",
  },
];

export default function RiderPage() {
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />

      <section className="border-b border-white/10 bg-gradient-to-b from-black/80 via-[#0E1236]/60 to-lethela-secondary">
        <div className="container grid gap-8 py-10 md:grid-cols-[1.2fr,1fr] md:py-14">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/65">Rider onboarding</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
              Deliver with Lethela - <span className="text-lethela-primary">Siyashesha</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-white/80 md:text-base">
              Flexible hours with local demand zones, live order flow, and clear operations support from day one.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {FLOW.map((step, index) => (
                <article key={step.title} className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="text-xs font-semibold text-lethela-primary">Step {index + 1}</p>
                  <h2 className="mt-1 text-sm font-semibold">{step.title}</h2>
                  <p className="mt-1 text-xs text-white/70">{step.text}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-white/15 bg-white/5 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">What you need</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              {REQUIREMENTS.map((item) => (
                <li key={item} className="rounded-lg border border-white/10 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-white/60">
              Questions before applying? WhatsApp support:{" "}
              <a className="underline" href="https://wa.me/27723908919" target="_blank" rel="noreferrer">
                +27 72 390 8919
              </a>
            </p>
          </aside>
        </div>
      </section>

      <section className="surface-section">
        <div className="container py-10">
          <RiderApplyForm />
        </div>
      </section>
    </main>
  );
}
