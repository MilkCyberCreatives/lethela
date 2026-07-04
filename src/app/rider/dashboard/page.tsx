import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MainHeader from "@/components/MainHeader";
import RiderDashboardClient from "@/components/rider/RiderDashboardClient";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Rider Dashboard",
  description:
    "Lethela rider dashboard for shifts, active deliveries, payouts, documents, and support.",
  alternates: {
    canonical: "/rider/dashboard",
  },
};

export default async function RiderDashboardPage() {
  const session = await auth().catch(() => null);
  if (!session?.user) {
    redirect(
      "/signin?tab=rider&callbackUrl=/rider/dashboard&message=Please sign in to open your rider dashboard.",
    );
  }
  if (session.user.role !== "RIDER" && session.user.role !== "ADMIN") {
    redirect(
      "/signin?tab=rider&callbackUrl=/rider/dashboard&message=Use a rider account to open the rider dashboard.",
    );
  }

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />
      <section className="container py-8">
        <RiderDashboardClient />
      </section>
    </main>
  );
}
