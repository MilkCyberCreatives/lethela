import Link from "next/link";
import type { ReactNode } from "react";
import { LayoutDashboard, LifeBuoy, ShieldCheck, Store, UserRoundCog } from "lucide-react";
import MainHeader from "@/components/MainHeader";

type RiderView = "overview" | "profile";

const navigation = [
  {
    id: "overview" as const,
    href: "/rider/dashboard",
    label: "Overview",
    hint: "Dispatch and earnings",
    icon: LayoutDashboard,
  },
  {
    id: "profile" as const,
    href: "/rider/dashboard/profile",
    label: "Profile & documents",
    hint: "KYC, vehicle and banking",
    icon: UserRoundCog,
  },
  {
    id: "marketplace" as const,
    href: "/",
    label: "Marketplace",
    hint: "Open the public platform",
    icon: Store,
  },
  {
    id: "support" as const,
    href: "/contact",
    label: "Support",
    hint: "Contact Lethela operations",
    icon: LifeBuoy,
  },
] as const;

export default function RiderDashboardShell({
  activeView,
  userLabel,
  eyebrow,
  title,
  description,
  children,
}: {
  activeView: RiderView;
  userLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />
      <section className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="dashboard-sidebar-intro border-b border-white/10 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lethela-primary">
              Lethela Rider
            </p>
            <h1 className="mt-2 text-xl font-bold">Delivery workspace</h1>
            <p className="dashboard-sidebar-description mt-2 text-xs leading-5 text-white/60">
              Manage dispatch, profile readiness, messages and rider earnings from one secure place.
            </p>
          </div>

          <nav
            className="dashboard-sidebar-nav mt-5 grid gap-2"
            aria-label="Rider dashboard navigation"
          >
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeView;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="dashboard-side-link"
                  data-active={active ? "true" : "false"}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate">{item.label}</span>
                    <span className="dashboard-side-link-hint mt-0.5 block truncate text-[11px] font-normal text-white/45">
                      {item.hint}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="dashboard-security-note dashboard-sidebar-security">
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
                {eyebrow}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {userLabel}
            </span>
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}
