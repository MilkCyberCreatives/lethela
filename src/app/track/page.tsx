import type { Metadata } from "next";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import OrderLookupForm from "@/components/OrderLookupForm";

export const metadata: Metadata = {
  title: "Track Order",
  description: "Securely verify your Lethela order reference and phone number to open tracking.",
  alternates: {
    canonical: "/track",
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Track your Lethela order",
    description: "Securely verify your order reference and phone number to open live tracking.",
    url: "/track",
  },
  twitter: {
    title: "Track your Lethela order",
    description: "Securely verify your order reference and phone number to open live tracking.",
  },
};

export default function TrackOrderPage() {
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />

      <section className="container max-w-2xl py-10 md:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethela-primary">
          Secure order access
        </p>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">Track your order</h1>
        <p className="mt-3 text-sm leading-6 text-white/75 md:text-base">
          Enter the order reference and the phone number used at checkout. A reference by itself no
          longer reveals whether an order exists.
        </p>
        <OrderLookupForm />
      </section>

      <Footer />
    </main>
  );
}
