import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, LifeBuoy, ShieldCheck, Store, UserRoundCog } from "lucide-react";
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
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const navigation = [
  {
    href: "/rider/dashboard",
    label: "Overview",
    hint: "Dispatch and earnings",
    icon: LayoutDashboard,
    active: true,
  },
  {
    href: "/rider/dashboard/profile",
    label: "Profile & documents",
    hint: "KYC, vehicle and banking",
    icon: UserRoundCog,
    active: false,
  },
  {
    href: "/",
    label: "Marketplace",
    hint: "Open the public platform",
    icon: Store,
    active: false,
  },
  {
    href: "/contact",
    label: "Support",
    hint: "Contact Lethela operations",
    icon: LifeBuoy,
    active: false,
  },
] as const;

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
      <section className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="border-b border-white/10 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lethela-primary">
              Lethela Rider
            </p>
            <h1 className="mt-2 text-xl font-bold">Delivery workspace</h1>
            <p className="mt-2 text-xs leading-5 text-white/60">
              Manage dispatch, profile readiness, messages and rider earnings from one secure place.
            </p>
          </div>

          <nav className="mt-5 grid gap-2" aria-label="Rider dashboard navigation">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="dashboard-side-link"
                  data-active={item.active ? "true" : "false"}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate">{item.label}</span>
                    <span className="mt-0.5 block truncate text-[11px] font-normal text-white/45">
                      {item.hint}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="dashboard-security-note">
            <div className="flex items-center gap-2 font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-lethela-primary" aria-hidden="true" />
              Private rider access
            </div>
            <p className="mt-2 text-white/55">
              Rider documents, banking details and dispatch information are never published on the
              marketplace.
            </p>
          </div>
        </aside>

        <div className="dashboard-workspace">
          <header className="dashboard-workspace-header">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-lethela-primary">
                Operations dashboard
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">Rider command centre</h2>
              <p className="mt-1 text-sm text-slate-500">
                Signed in as {session.user.email || session.user.name || "approved rider"}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Secure session
            </span>
          </header>
          <RiderDashboardClient />
        </div>
      </section>
    </main>
  );
}
