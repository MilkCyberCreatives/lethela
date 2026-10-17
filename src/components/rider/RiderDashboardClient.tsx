"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Lock,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  RefreshCw,
  ShieldCheck,
  Store,
} from "lucide-react";
import {
  ChecklistItem,
  DetailRow,
  EmptyState,
  Notice,
  Panel,
  StatusBadge,
  dashButton,
  statusText,
  toneForStatus,
} from "@/components/dashboard/kit/ui";

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
    pickupInstructions: string | null;
    vendorPhone: string | null;
    dropoff: {
      customerName: string;
      phone: string;
      address: string;
      landmark: string;
      notes: string;
      containsAlcohol: boolean;
    };
    totalCents: number;
    deliveryFeeCents: number;
    riderTipCents: number;
    riderPayoutCents: number;
    riderLocatedAt: string | null;
    createdAt: string;
    updatedAt: string;
    consoleUrl: string | null;
  }>;
};

type RiderOffer = {
  ref: string;
  vendor: string;
  pickupArea: string;
  dropoffArea: string;
  distanceKm: number | null;
  earnCents: number;
  offeredAt: string;
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

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function riderOrderPriority(status: string) {
  const priority: Record<string, number> = {
    ON_THE_WAY: 0,
    PICKED_UP: 1,
    RIDER_ASSIGNED: 2,
    READY_FOR_PICKUP: 3,
    PREPARING: 4,
    VENDOR_ACCEPTED: 5,
  };
  return priority[status] ?? 20;
}

export default function RiderDashboardClient() {
  const [data, setData] = useState<RiderMeResponse | null>(null);
  const [messages, setMessages] = useState<PlatformMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<RiderOffer[]>([]);
  const [answering, setAnswering] = useState<string | null>(null);
  const [offerNote, setOfferNote] = useState<string | null>(null);

  async function loadOffers() {
    try {
      const response = await fetch("/api/riders/me/offers", { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      setOffers(json?.ok && Array.isArray(json.offers) ? json.offers : []);
    } catch {
      // Keep the last list on a failed check.
    }
  }

  // Delivery requests go to several riders at once, so check for new ones often.
  useEffect(() => {
    void loadOffers();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadOffers();
    }, 15_000);
    const onFocus = () => void loadOffers();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  async function answerOffer(ref: string, action: "accept" | "decline") {
    setAnswering(ref);
    setOfferNote(null);
    try {
      const response = await fetch(`/api/riders/me/offers/${encodeURIComponent(ref)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setOfferNote(json?.error || "Could not answer this request. Please try again.");
      } else if (action === "accept") {
        setOfferNote(`${ref} is yours. Collect it from the store.`);
      }
    } catch {
      setOfferNote("Could not answer this request. Please try again.");
    } finally {
      setAnswering(null);
      await Promise.all([loadOffers(), action === "accept" ? load() : Promise.resolve()]);
    }
  }

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
      { label: "Rider account created", complete: Boolean(data?.user) },
      { label: "Application sent", complete: Boolean(application) },
      { label: "Approved by Lethela", complete: Boolean(data?.readiness?.approved) },
      { label: "Smartphone ready", complete: Boolean(application?.hasSmartphone) },
      { label: "Bank account for payouts", complete: Boolean(application?.hasBankAccount) },
      {
        label: "Delivery links switched on by Lethela",
        complete: Boolean(data?.readiness?.canReceiveDispatch),
      },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="grid animate-pulse gap-4" aria-hidden="true">
        <div className="h-32 rounded-xl border border-slate-200 bg-white" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-48 rounded-xl border border-slate-200 bg-white" />
          <div className="h-48 rounded-xl border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  if (!data?.ok) {
    const signInHref = `/signin?callbackUrl=${encodeURIComponent("/rider/dashboard")}`;
    return (
      <EmptyState
        icon={<Lock />}
        title="Sign in with your rider account"
        text={data?.error || "Sign in with a rider account to see your deliveries."}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href={signInHref} className={dashButton.primary}>
              Sign in
            </Link>
            <Link href="/rider" className={dashButton.secondary}>
              Become a rider
            </Link>
          </div>
        }
      />
    );
  }

  const application = data.application;
  const orders = [...(data.activeOrders || [])].sort((left, right) => {
    const priorityDifference = riderOrderPriority(left.status) - riderOrderPriority(right.status);
    if (priorityDifference !== 0) return priorityDifference;
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
  const approved = Boolean(data.readiness?.approved);
  const setupDone = checklist.every((item) => item.complete);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={application ? toneForStatus(application.status) : "neutral"}>
          {application ? statusText(application.status) : "No application yet"}
        </StatusBadge>
        {data.readiness?.area ? (
          <StatusBadge tone="neutral" dot={false}>
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {data.readiness.area}
          </StatusBadge>
        ) : null}
        <button type="button" onClick={load} className={`${dashButton.quiet} ml-auto`}>
          <RefreshCw aria-hidden="true" />
          Refresh
        </button>
      </div>

      {!application ? (
        <Notice
          tone="warning"
          title="Send your rider application"
          action={
            <Link href="/rider" className={dashButton.primary}>
              Start application
            </Link>
          }
        >
          Use the same email as this account so we can link it to you.
        </Notice>
      ) : null}

      {offers.length > 0 || offerNote ? (
        <Panel
          title="Delivery requests"
          description="Sent to riders near the store. The first rider to accept gets it."
          padded={offers.length === 0}
        >
          {offerNote ? (
            <p
              className={`text-sm text-slate-700 ${offers.length > 0 ? "px-4 pt-4 sm:px-5" : ""}`}
              role="status"
            >
              {offerNote}
            </p>
          ) : null}
          {offers.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {offers.map((offer) => (
                <li key={offer.ref} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <BellRing className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        {offer.vendor}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500">{offer.ref}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      You earn {money(offer.earnCents)}
                    </p>
                  </div>
                  <p className="mt-2 flex items-start gap-2 text-sm text-slate-700">
                    <Store className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="min-w-0">
                      Collect from {offer.pickupArea || offer.vendor}
                      {offer.distanceKm !== null
                        ? ` · ${offer.distanceKm.toFixed(1)} km from you`
                        : ""}
                    </span>
                  </p>
                  {offer.dropoffArea ? (
                    <p className="mt-2 flex items-start gap-2 text-sm text-slate-700">
                      <MapPin
                        className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">Deliver to {offer.dropoffArea}</span>
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={answering !== null}
                      onClick={() => void answerOffer(offer.ref, "accept")}
                      className={`${dashButton.primary} min-h-11`}
                    >
                      {answering === offer.ref ? "Accepting…" : "Accept delivery"}
                    </button>
                    <button
                      type="button"
                      disabled={answering !== null}
                      onClick={() => void answerOffer(offer.ref, "decline")}
                      className={`${dashButton.secondary} min-h-11`}
                    >
                      Not now
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>
      ) : null}

      <Panel
        title="Current deliveries"
        description={
          orders.length > 0
            ? `${orders.length} assigned to you`
            : "Deliveries assigned to you show here."
        }
        padded={orders.length === 0}
      >
        {!approved ? (
          <EmptyState
            compact
            icon={<ShieldCheck />}
            title="Waiting for approval"
            text="You will see deliveries once Lethela approves your application."
          />
        ) : orders.length === 0 ? (
          <EmptyState
            compact
            icon={<PackageCheck />}
            title="No deliveries right now"
            text="Go online and stay close to your phone. New deliveries show here."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {orders.map((order) => (
              <li key={order.ref} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{order.ref}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{order.vendor}</p>
                  </div>
                  <StatusBadge tone={toneForStatus(order.status)}>
                    {statusText(order.status)}
                  </StatusBadge>
                </div>
                <p className="mt-2 flex items-start gap-2 text-sm text-slate-700">
                  <Store className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="min-w-0">
                    Collect from {order.pickupArea}
                    {order.vendorPhone ? (
                      <>
                        {" · "}
                        <a
                          href={telHref(order.vendorPhone)}
                          className="font-medium text-slate-900 underline"
                        >
                          Call the store
                        </a>
                      </>
                    ) : null}
                  </span>
                </p>
                {order.pickupInstructions ? (
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    {order.pickupInstructions}
                  </p>
                ) : null}
                <p className="mt-2 flex items-start gap-2 text-sm text-slate-700">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="min-w-0">
                    Deliver to {order.dropoff.address || "the address Lethela gives you"}
                  </span>
                </p>
                {order.dropoff.customerName || order.dropoff.phone ? (
                  <p className="mt-2 flex items-start gap-2 text-sm text-slate-700">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="min-w-0">
                      {order.dropoff.customerName || "Customer"}
                      {order.dropoff.phone ? (
                        <>
                          {" · "}
                          <a
                            href={telHref(order.dropoff.phone)}
                            className="font-medium text-slate-900 underline"
                          >
                            {order.dropoff.phone}
                          </a>
                        </>
                      ) : null}
                    </span>
                  </p>
                ) : null}
                {order.dropoff.landmark || order.dropoff.notes ? (
                  <div className="mt-2 space-y-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    {order.dropoff.landmark ? <p>Landmark: {order.dropoff.landmark}</p> : null}
                    {order.dropoff.notes ? <p>Notes: {order.dropoff.notes}</p> : null}
                  </div>
                ) : null}
                {order.dropoff.containsAlcohol ? (
                  <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                    Liquor order: check the customer&apos;s ID at handover.
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-600">
                    You earn{" "}
                    <span className="font-semibold text-slate-900">
                      {money(order.riderPayoutCents)}
                    </span>
                    <span className="text-slate-400">
                      {" "}
                      (fee {money(order.deliveryFeeCents)}, tip {money(order.riderTipCents)})
                    </span>
                  </p>
                  {order.consoleUrl ? (
                    <Link href={order.consoleUrl} className={dashButton.primary}>
                      <Navigation aria-hidden="true" />
                      Open delivery
                    </Link>
                  ) : (
                    <span className="text-xs text-amber-800">
                      Delivery link not switched on yet. Contact Lethela.
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {!setupDone ? (
          <Panel
            title="Getting ready"
            description="What is left before you can take deliveries"
            action={
              <Link href="/rider/dashboard/profile" className={dashButton.link}>
                Open profile
              </Link>
            }
          >
            <div className="divide-y divide-slate-100">
              {checklist.map((item) => (
                <ChecklistItem key={item.label} done={item.complete} label={item.label} />
              ))}
            </div>
          </Panel>
        ) : null}

        <Panel
          title="Your details"
          action={
            <Link href="/rider/dashboard/profile" className={dashButton.link}>
              Edit
            </Link>
          }
        >
          {application ? (
            <div className="divide-y divide-slate-100">
              <DetailRow
                label="Vehicle"
                value={`${application.vehicleType}${application.vehicleRegistration ? ` (${application.vehicleRegistration})` : ""}`}
              />
              <DetailRow label="Licence" value={application.licenseCode || "Not added"} />
              <DetailRow
                label="Emergency contact"
                value={
                  application.emergencyContactName
                    ? `${application.emergencyContactName} (${application.emergencyContactPhone})`
                    : "Not added"
                }
              />
              <DetailRow
                label="When you can work"
                value={application.availableHours || "Not added"}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Your details show here once your rider application is linked to this account.
            </p>
          )}
        </Panel>

        <Panel
          title="Messages from Lethela"
          className={setupDone ? "" : "lg:col-span-2"}
          padded={messages.length === 0}
        >
          {messages.length === 0 ? (
            <EmptyState compact title="No messages yet" text="Updates from Lethela show here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {messages.map((message) => (
                <li key={message.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{message.subject}</h3>
                    <span className="text-xs text-slate-400">
                      {new Date(message.createdAt).toLocaleString("en-ZA", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {message.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
