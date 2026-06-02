import type { Metadata } from "next";
import MainHeader from "@/components/MainHeader";
import RiderDashboardClient from "@/components/rider/RiderDashboardClient";

export const metadata: Metadata = {
  title: "Rider Dashboard",
  description: "Lethela rider dashboard for shifts, active deliveries, payouts, documents, and support.",
  alternates: {
    canonical: "/rider/dashboard",
  },
};

export default function RiderDashboardPage() {
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />
      <section className="container py-8">
        <RiderDashboardClient />
      </section>
    </main>
  );
}
