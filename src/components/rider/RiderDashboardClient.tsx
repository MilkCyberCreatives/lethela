"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bike,
  CalendarDays,
  CheckCircle2,
  Lock,
  MapPin,
  Navigation,
  PackageCheck,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type RiderMeResponse = {
  ok: boolean;
  error?: string;
  user?: {
    name: string | null;
    email: string;
    role: string;
  };
  application?: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    licenseCode: string;
    suburb: string;
    city: string;
    vehicleType: string;
    vehicleRegistration: string | null;
    availableHours: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    hasSmartphone: boolean;
    hasBankAccount: boolean;
    experience: string | null;
    aiSummary: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  readiness?: {
    approved: boolean;
    canReceiveDispatch: boolean;
    hasApplication: boolean;
    documentsReady: boolean;
    area: string | null;
  };
  activeOrders?: Array<{
    ref: string;
    status: string;
    vendor: string;
    pickupArea: string;
    totalCents: number;
    deliveryFeeCents: number;
    riderLocatedAt: string | null;
    createdAt: string;
    updatedAt: string;
    consoleUrl: string | null;
  }>;
};

type PlatformMessage = {
  id: string;
  subject: string;
  body: string;
  channel: string;
  createdAt: string;
};

function money(cents: number) {
  return `R ${(Number(cents || 0) / 100).toFixed(2)}`;
}

function statusClass(status?: string) {
  if (status === "APPROVED") return "border-emerald-300/35 bg-emerald-300/10 text-emerald-100";
  if (status === "REJECTED") return "border-red-300/35 bg-red-300/10 text-red-100";
  if (status === "UNDER_REVIEW") return "border-amber-300/35 bg-amber-300/10 text-amber-100";
  return "border-white/15 bg-white/5 text-white/75";
}

export default function RiderDashboardClient() {
  const [data, setData] = useState<RiderMeResponse | null>(null);
  const [messages, setMessages] = useState<PlatformMessage[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [response, messagesResponse] = await Promise.all([
        fetch("/api/riders/me", { cache: "no-store" }),
        fetch("/api/riders/messages", { cache: "no-store" }).catch(() => null),
      ]);
      const json = (await response.json().catch(() => ({
        ok: false,
        error: "Failed to load rider dashboard.",
      }))) as RiderMeResponse;
      const messagesJson = messagesResponse
        ? await messagesResponse.json().catch(() => ({ ok: false, items: [] }))
        : { ok: false, items: [] };
      setData(json);
      setMessages(messagesJson.ok ? messagesJson.items || [] : []);
    } catch {
      setData({
        ok: false,
        error: "We could not load the rider dashboard right now. Please sign in or try again.",
      });
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const checklist = useMemo(() => {
    const application = data?.application;
    return [
      { label: "Rider account signed in", complete: Boolean(data?.user) },
      { label: "Rider application submitted", complete: Boolean(application) },
      { label: "Ops approval complete", complete: Boolean(data?.readiness?.approved) },
      { label: "Smartphone confirmed", complete: Boolean(application?.hasSmartphone) },
      { label: "Bank account confirmed", complete: Boolean(application?.hasBankAccount) },
      {
        label: "Secure dispatch links configured",
        complete: Boolean(data?.readiness?.canReceiveDispatch),
      },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 text-sm text-white/70">
        Loading rider dashboard...
      </div>
    );
  }

  if (!data?.ok) {
    const signInHref = `/signin?callbackUrl=${encodeURIComponent("/rider/dashboard")}`;
    return (
      <section className="rounded-lg border border-white/10 bg-[#0C1132] p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-lethela-primary/15 text-lethela-primary">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">Rider sign-in required</h1>
            <p className="mt-1 text-sm text-white/65">
              {data?.error || "Sign in with a rider account to view this dashboard."}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild className="bg-lethela-primary text-white hover:opacity-90">
            <Link href={signInHref}>Sign in as rider</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
          >
            <Link href="/signup">Create rider account</Link>
          </Button>
        </div>
      </section>
    );
  }

  const application = data.application;
  const orders = data.activeOrders || [];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-white/10 bg-[#0C1132] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-lethela-primary">
              Rider workspace
            </p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">Delivery dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/68">
              {application
                ? `Welcome ${application.fullName}. Your dashboard is connected to your Lethela rider application.`
                : "Your rider account is active, but no rider application is linked to this email address yet."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="bg-lethela-primary text-white hover:opacity-90" onClick={load}>
              Refresh
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
          <Metric
            label="Status"
            value={application?.status?.replaceAll("_", " ") || "No application"}
            note="Ops onboarding state"
            icon={ShieldCheck}
          />
          <Metric
            label="Area"
            value={data.readiness?.area || "Not set"}
            note="Primary dispatch zone"
            icon={MapPin}
          />
          <Metric
            label="Open orders"
            value={orders.length}
            note="Paid orders available for dispatch"
            icon={PackageCheck}
          />
          <Metric
            label="Est. delivery fees"
            value={money(orders.reduce((sum, order) => sum + order.deliveryFeeCents, 0))}
            note="Visible active dispatch pool"
            icon={WalletCards}
          />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-white/50">Dispatch</p>
              <h2 className="mt-1 text-lg font-semibold">Active delivery lane</h2>
            </div>
            <Navigation className="h-5 w-5 text-lethela-primary" />
          </div>
          <div className="mt-4 grid gap-3">
            {!data.readiness?.approved ? (
              <EmptyPanel
                title="Approval required"
                text="Riders can see dispatch orders after ops approves the application."
              />
            ) : orders.length === 0 ? (
              <EmptyPanel
                title="No active paid orders"
                text="Paid orders in preparing or delivery states will appear here."
              />
            ) : (
              orders.map((order) => (
                <article
                  key={order.ref}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{order.ref}</p>
                      <p className="mt-1 text-xs text-white/60">{order.vendor}</p>
                    </div>
                    <span className="rounded-full border border-lethela-primary/35 bg-lethela-primary/10 px-3 py-1 text-xs text-red-100">
                      {order.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-white/75">
                    <MapPin className="h-4 w-4 text-lethela-primary" />
                    {order.pickupArea}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {order.consoleUrl ? (
                      <Button asChild className="bg-lethela-primary text-white hover:opacity-90">
                        <Link href={order.consoleUrl}>Open rider console</Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-amber-100">
                        Rider console secret is not configured.
                      </span>
                    )}
                    <span className="text-xs text-white/60">
                      Delivery fee: {money(order.deliveryFeeCents)}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-white/50">Launch readiness</p>
              <h2 className="mt-1 text-lg font-semibold">Rider checklist</h2>
            </div>
            <Bike className="h-5 w-5 text-lethela-primary" />
          </div>
          <div className="mt-4 grid gap-3">
            {checklist.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3"
              >
                <CheckCircle2
                  className={`h-4 w-4 ${item.complete ? "text-lethela-primary" : "text-white/30"}`}
                />
                <span className="text-sm text-white/75">{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-lethela-primary" />
              <h2 className="text-lg font-semibold">Messages from Lethela</h2>
            </div>
            <Button
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
              onClick={load}
            >
              Refresh messages
            </Button>
          </div>
          <div className="mt-4 grid gap-3">
            {messages.length === 0 ? (
              <EmptyPanel
                title="No owner messages yet"
                text="Important rider updates from Lethela management will appear here."
              />
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">{message.subject}</h3>
                      <p className="mt-1 text-xs text-white/45">
                        {new Date(message.createdAt).toLocaleString()} ·{" "}
                        {message.channel.replaceAll("_", " ")}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/72">
                    {message.body}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-lethela-primary" />
            <h2 className="text-lg font-semibold">Availability</h2>
          </div>
          <p className="mt-3 text-sm text-white/65">
            {application?.availableHours ||
              "Availability will appear after your rider application is submitted."}
          </p>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-lethela-primary" />
            <h2 className="text-lg font-semibold">Application profile</h2>
          </div>
          {application ? (
            <div className="mt-3 space-y-2 text-sm text-white/65">
              <p>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${statusClass(application.status)}`}
                >
                  {application.status.replaceAll("_", " ")}
                </span>
              </p>
              <p>
                Vehicle: {application.vehicleType}
                {application.vehicleRegistration ? ` (${application.vehicleRegistration})` : ""}
              </p>
              <p>Licence: {application.licenseCode}</p>
              <p>
                Emergency: {application.emergencyContactName} ({application.emergencyContactPhone})
              </p>
              {application.aiSummary ? (
                <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  {application.aiSummary}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-white/65">
              Submit the rider application with the same email as your account to link this
              dashboard.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof Bike;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-white/55">{label}</p>
          <p className="mt-2 text-xl font-bold">{value}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-lethela-primary/15 text-lethela-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs text-white/60">{note}</p>
    </article>
  );
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-white/60">{text}</p>
    </div>
  );
}
