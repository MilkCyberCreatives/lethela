import type { Metadata } from "next";
import { redirect } from "next/navigation";
import RiderDashboardClient from "@/components/rider/RiderDashboardClient";
import RiderDashboardShell from "@/components/rider/RiderDashboardShell";
import RiderOperationsPanel from "@/components/rider/RiderOperationsPanel";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Rider Dashboard",
  description:
    "Lethela rider dashboard for shifts, active deliveries, payouts, documents, and support.",
  alternates: {
    canonical: "/rider/dashboard",
  },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    <RiderDashboardShell
      activeView="overview"
      riderName={session.user.name || "Your rider account"}
      riderEmail={session.user.email}
      title="Deliveries"
      description="Go online when you are ready to deliver. Deliveries assigned to you show here."
    >
      <div className="space-y-4">
        <RiderOperationsPanel />
        <RiderDashboardClient />
      </div>
    </RiderDashboardShell>
  );
}
