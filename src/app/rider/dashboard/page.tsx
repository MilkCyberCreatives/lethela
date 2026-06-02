import type { Metadata } from "next";
import Link from "next/link";
import {
  Bike,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  PackageCheck,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import MainHeader from "@/components/MainHeader";
import { Button } from "@/components/ui/button";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

export const metadata: Metadata = {
  title: "Rider Dashboard",
  description: "Lethela rider dashboard for shifts, active deliveries, payouts, documents, and support.",
  alternates: {
    canonical: "/rider/dashboard",
  },
};

const SHIFT_TASKS = [
  "Confirm phone battery and mobile data",
  "Check insulated delivery bag",
  "Mark yourself available in your delivery area",
  "Watch WhatsApp for dispatch updates",
];

const ACTIVE_DELIVERIES = [
  { ref: "LET-12345", pickup: "Soweto Grill House", dropoff: "Orlando West", state: "Ready for pickup" },
  { ref: "LET-12362", pickup: "Kasi Fresh Market", dropoff: "Diepkloof", state: "Vendor preparing" },
];

const PERFORMANCE = [
  { label: "Completed", value: "38", note: "Deliveries this week", icon: PackageCheck },
  { label: "On-time", value: "94%", note: "Current reliability score", icon: Clock },
  { label: "Earnings", value: "R 1,240", note: "Estimated weekly payout", icon: WalletCards },
  { label: "Area", value: "Soweto", note: "Primary delivery zone", icon: MapPin },
];

export default function RiderDashboardPage() {
  const whatsappHref = `https://wa.me/${getOrderWhatsAppPhone()}`;

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />

      <section className="container py-8">
        <div className="rounded-lg border border-white/10 bg-[#0C1132] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-lethela-primary">Rider workspace</p>
              <h1 className="mt-2 text-2xl font-bold md:text-3xl">Delivery dashboard</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/68">
                A focused rider surface for shift readiness, assigned orders, payout visibility, documents and support.
                This is ready to connect to rider authentication and live dispatch APIs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-lethela-primary text-white hover:opacity-90">
                <a href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Support
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
              >
                <Link href="/rider">Application</Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {PERFORMANCE.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-white/55">{item.label}</p>
                      <p className="mt-2 text-2xl font-bold">{item.value}</p>
                    </div>
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-lethela-primary/15 text-lethela-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-white/60">{item.note}</p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
          <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/50">Dispatch</p>
                <h2 className="mt-1 text-lg font-semibold">Active delivery lane</h2>
              </div>
              <Navigation className="h-5 w-5 text-lethela-primary" />
            </div>
            <div className="mt-4 grid gap-3">
              {ACTIVE_DELIVERIES.map((delivery) => (
                <article key={delivery.ref} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{delivery.ref}</p>
                      <p className="mt-1 text-xs text-white/60">{delivery.pickup}</p>
                    </div>
                    <span className="rounded-full border border-lethela-primary/35 bg-lethela-primary/10 px-3 py-1 text-xs text-red-100">
                      {delivery.state}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-white/75">
                    <MapPin className="h-4 w-4 text-lethela-primary" />
                    {delivery.dropoff}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/50">Shift</p>
                <h2 className="mt-1 text-lg font-semibold">Readiness checklist</h2>
              </div>
              <Bike className="h-5 w-5 text-lethela-primary" />
            </div>
            <div className="mt-4 grid gap-3">
              {SHIFT_TASKS.map((task) => (
                <div key={task} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <CheckCircle2 className="h-4 w-4 text-lethela-primary" />
                  <span className="text-sm text-white/75">{task}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-lethela-primary" />
              <h2 className="text-lg font-semibold">Availability</h2>
            </div>
            <p className="mt-3 text-sm text-white/65">
              Future live mode will let riders set shifts, pause availability, update zones and accept dispatch tasks from
              the same screen.
            </p>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-lethela-primary" />
              <h2 className="text-lg font-semibold">Documents</h2>
            </div>
            <p className="mt-3 text-sm text-white/65">
              ID, licence, banking and emergency-contact verification will appear here after rider login is connected.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
