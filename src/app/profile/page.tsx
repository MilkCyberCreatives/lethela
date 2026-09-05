import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Heart, LifeBuoy, PackageSearch, ShieldCheck, UserRound } from "lucide-react";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import UserProfileForm from "@/components/profile/UserProfileForm";
import OrderHistoryPanel from "@/components/profile/OrderHistoryPanel";
import ProfileExperiencePanel from "@/components/profile/ProfileExperiencePanel";
import { auth } from "@/auth";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Profile",
  description: "Manage your Lethela account profile.",
  path: "/profile",
});

const accountLinks = [
  { href: "#profile-details", label: "Profile details", icon: UserRound },
  { href: "#order-history", label: "Order history", icon: PackageSearch },
  { href: "#saved-activity", label: "Saved activity", icon: Heart },
  { href: "#notifications", label: "Notifications", icon: Bell },
];

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }> | { welcome?: string };
}) {
  const resolved = await Promise.resolve(searchParams);
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/profile");
  }

  return (
    <div className="min-h-dvh bg-[#f5f7fb] text-slate-950">
      <MainHeader />

      <main className="container py-4 sm:py-10 lg:py-12">
        {resolved.welcome === "1" ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <p className="font-semibold">Your account is ready.</p>
              <p className="mt-1 text-emerald-800">
                Add your name and mobile number now so checkout and delivery updates are easier.
              </p>
            </div>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl bg-lethela-secondary text-white shadow-[0_24px_70px_rgba(8,11,39,0.16)] sm:rounded-[2rem]">
          <div className="grid gap-4 p-5 sm:gap-7 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                <ShieldCheck className="h-4 w-4 text-lethela-primary" />
                Private account area
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:mt-5 sm:text-4xl">
                My Lethela account
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70 sm:mt-3 sm:text-base sm:leading-7">
                Manage delivery details, orders, saved meals and notification preferences.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <Link
                href="/search"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-lethela-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Shop marketplace
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                <LifeBuoy className="h-4 w-4" />
                Get support
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 grid min-w-0 items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="account-dashboard-nav rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-28">
            <p className="px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Account menu
            </p>
            <nav aria-label="Account sections" className="account-dashboard-nav-links grid gap-1">
              {accountLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="account-dashboard-nav-link flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                  >
                    <Icon className="h-4 w-4 text-lethela-primary" />
                    {item.label}
                  </a>
                );
              })}
            </nav>
            <div className="account-dashboard-privacy mt-3 border-t border-slate-200 px-3 pt-4 text-xs leading-5 text-slate-500">
              Your account and order information is private and excluded from search engines.
            </div>
          </aside>

          <div className="grid min-w-0 gap-6">
            <section id="profile-details" className="scroll-mt-28">
              <UserProfileForm />
            </section>
            <section id="order-history" className="scroll-mt-28">
              <OrderHistoryPanel />
            </section>
            <section id="saved-activity" className="scroll-mt-28">
              <ProfileExperiencePanel />
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
