"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  Heart,
  LoaderCircle,
  RefreshCcw,
  RotateCcw,
  ShoppingBag,
  Smartphone,
  Star,
} from "lucide-react";
import { formatZAR } from "@/lib/format";
import {
  pushDataLayerEvent,
  registerPushSubscription,
  trackVisitorEvent,
  unregisterPushSubscription,
} from "@/lib/visitor";
import { useCart } from "@/store/cart";

type ExperienceSnapshot = {
  favorites: Array<{
    productId: string;
    productName: string;
    productImage: string | null;
    vendorName: string;
    vendorSlug: string;
    priceCents: number;
    savedAt: string;
  }>;
  recentOrders: Array<{
    id: string;
    publicId: string;
    createdAt: string;
    totalCents: number;
    vendorId: string;
    vendorName: string;
    vendorSlug: string;
    items: Array<{
      productId: string | null;
      itemId: string | null;
      name: string;
      priceCents: number;
      qty: number;
      image: string | null;
    }>;
  }>;
  reviewSummary: {
    totalRatings: number;
    averageRating: number | null;
  };
  pushPreferences: {
    marketingEnabled: boolean;
    orderUpdatesEnabled: boolean;
    recommendationsEnabled: boolean;
    adminAlertsEnabled: boolean;
  };
};

type PreferenceKey = "marketingEnabled" | "orderUpdatesEnabled" | "recommendationsEnabled";

const preferenceLabels: Array<{
  key: PreferenceKey;
  label: string;
  description: string;
}> = [
  {
    key: "orderUpdatesEnabled",
    label: "Order updates",
    description: "Preparation, rider assignment and delivery progress.",
  },
  {
    key: "recommendationsEnabled",
    label: "Personal recommendations",
    description: "Relevant meals and stores based on your activity.",
  },
  {
    key: "marketingEnabled",
    label: "Offers and announcements",
    description: "Occasional Lethela promotions and service updates.",
  },
];

export default function ProfileExperiencePanel() {
  const add = useCart((state) => state.add);
  const clear = useCart((state) => state.clear);
  const [snapshot, setSnapshot] = useState<ExperienceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [status, setStatus] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [pushPermission, setPushPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );

  const favoriteCountLabel = useMemo(() => snapshot?.favorites.length ?? 0, [snapshot]);

  async function load() {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/me/experience", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load your saved activity.");
      }
      setSnapshot(json.snapshot);
    } catch (error: unknown) {
      setStatus({
        message: error instanceof Error ? error.message : "Failed to load your saved activity.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function savePreference(key: PreferenceKey, value: boolean) {
    setBusyKey(key);
    setStatus(null);
    try {
      const response = await fetch("/api/me/push-preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Could not save notification preferences.");
      }
      setSnapshot((current) =>
        current
          ? {
              ...current,
              pushPreferences: {
                ...current.pushPreferences,
                ...json.preferences,
              },
            }
          : current,
      );
      setStatus({ message: "Notification preferences updated.", tone: "success" });
    } catch (error: unknown) {
      setStatus({
        message:
          error instanceof Error ? error.message : "Could not save notification preferences.",
        tone: "error",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function enableBrowserPush() {
    if (pushPermission === "unsupported") {
      setStatus({ message: "This browser does not support push notifications.", tone: "error" });
      return;
    }
    if (pushPermission === "denied") {
      setStatus({
        message:
          "Notifications are blocked in this browser. Enable them in the site settings first.",
        tone: "error",
      });
      return;
    }

    setBusyKey("browser-push");
    setStatus(null);
    try {
      const result = await registerPushSubscription();
      if (!result.ok) {
        throw new Error("Push could not be enabled on this browser.");
      }
      setPushPermission(typeof Notification !== "undefined" ? Notification.permission : "granted");
      setStatus({ message: "Browser push enabled on this device.", tone: "success" });
    } catch (error: unknown) {
      setStatus({
        message: error instanceof Error ? error.message : "Push could not be enabled.",
        tone: "error",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function disableBrowserPush() {
    setBusyKey("browser-push");
    setStatus(null);
    try {
      await unregisterPushSubscription();
      setStatus({ message: "Browser push disabled on this device.", tone: "success" });
    } catch (error: unknown) {
      setStatus({
        message: error instanceof Error ? error.message : "Push could not be disabled.",
        tone: "error",
      });
    } finally {
      setBusyKey(null);
    }
  }

  function reorder(order: ExperienceSnapshot["recentOrders"][number]) {
    clear();
    for (const item of order.items) {
      add(
        {
          itemId: item.productId || item.itemId || `${order.id}-${item.name}`,
          vendorId: order.vendorId,
          vendorSlug: order.vendorSlug,
          name: item.name,
          priceCents: item.priceCents,
          image: item.image,
        },
        item.qty,
      );
    }
    void trackVisitorEvent({
      type: "reorder",
      vendorSlug: order.vendorSlug,
      meta: {
        orderPublicId: order.publicId,
        items: order.items.length,
      },
    });
    pushDataLayerEvent("reorder", {
      order_ref: order.publicId,
      vendor_slug: order.vendorSlug,
      item_count: order.items.length,
    });
    setStatus({ message: "Your cart was rebuilt from the selected order.", tone: "success" });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethela-primary">
          Saved activity
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          Meals, reorders and notifications
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Return to meals you liked, rebuild a previous cart and control the customer notifications
          sent to this device.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 p-5 sm:p-6">
          <div className="grid animate-pulse gap-3 sm:grid-cols-3">
            <div className="h-24 rounded-2xl bg-slate-100" />
            <div className="h-24 rounded-2xl bg-slate-100" />
            <div className="h-24 rounded-2xl bg-slate-100" />
          </div>
          <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : !snapshot ? (
        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
            <p className="font-semibold">Saved activity could not be loaded</p>
            <p className="mt-1 text-sm text-red-700">{status?.message || "Please try again."}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <RefreshCcw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lethela-primary shadow-sm ring-1 ring-slate-200">
                <Heart className="h-4 w-4" />
              </span>
              <p className="mt-4 text-2xl font-bold text-slate-950">{favoriteCountLabel}</p>
              <p className="mt-1 text-sm text-slate-600">Saved meals</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lethela-primary shadow-sm ring-1 ring-slate-200">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <p className="mt-4 text-2xl font-bold text-slate-950">
                {snapshot.recentOrders.length}
              </p>
              <p className="mt-1 text-sm text-slate-600">Reorder shortcuts</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lethela-primary shadow-sm ring-1 ring-slate-200">
                <Star className="h-4 w-4" />
              </span>
              <p className="mt-4 text-2xl font-bold text-slate-950">
                {snapshot.reviewSummary.averageRating != null
                  ? snapshot.reviewSummary.averageRating.toFixed(1)
                  : "—"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {snapshot.reviewSummary.totalRatings} ratings submitted
              </p>
            </div>
          </div>

          <div className="grid min-w-0 gap-6 border-t border-slate-200 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <div className="min-w-0 space-y-7">
              <section>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">Saved meals</h3>
                    <p className="mt-1 text-sm text-slate-500">Open the store to order it again.</p>
                  </div>
                  <Heart className="h-5 w-5 text-slate-300" />
                </div>

                {snapshot.favorites.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                    Your saved meals will appear here after you select the heart on a product.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {snapshot.favorites.map((favorite) => (
                      <Link
                        key={favorite.productId}
                        href={`/vendors/${favorite.vendorSlug}`}
                        className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-lethela-primary hover:bg-slate-50"
                      >
                        {favorite.productImage ? (
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                            <Image
                              src={favorite.productImage}
                              alt={favorite.productName}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                            <Heart className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-950">
                            {favorite.productName}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500">
                            {favorite.vendorName}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-lethela-primary">
                            {formatZAR(favorite.priceCents)}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">Reorder shortcuts</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Rebuild your cart from a confirmed previous order.
                    </p>
                  </div>
                  <RotateCcw className="h-5 w-5 text-slate-300" />
                </div>

                {snapshot.recentOrders.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                    Confirmed orders will create quick reorder options here.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {snapshot.recentOrders.slice(0, 4).map((order) => (
                      <article key={order.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold text-slate-950">
                              {order.vendorName}
                            </h4>
                            <p className="mt-1 text-xs text-slate-500">
                              {new Date(order.createdAt).toLocaleDateString("en-ZA", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              • {order.publicId}
                            </p>
                            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                              {order.items.map((item) => `${item.qty}× ${item.name}`).join(", ")}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                            <p className="text-sm font-bold text-slate-950">
                              {formatZAR(order.totalCents)}
                            </p>
                            <button
                              type="button"
                              onClick={() => reorder(order)}
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lethela-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Reorder
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section id="notifications" className="scroll-mt-28">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lethela-primary shadow-sm ring-1 ring-slate-200">
                    <Bell className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">
                      Notification preferences
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Choose the customer updates you want. Internal admin alerts are never shown
                      here.
                    </p>
                  </div>
                </div>

                <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {preferenceLabels.map((item) => {
                    const enabled = snapshot.pushPreferences[item.key];
                    return (
                      <div key={item.key} className="flex items-center justify-between gap-4 p-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {item.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          aria-label={`${enabled ? "Disable" : "Enable"} ${item.label}`}
                          onClick={() => void savePreference(item.key, !enabled)}
                          disabled={busyKey === item.key}
                          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                            enabled ? "bg-lethela-primary" : "bg-slate-300"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                              enabled ? "left-6" : "left-1"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">This device</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {pushPermission === "granted"
                          ? "Browser notifications are enabled."
                          : pushPermission === "denied"
                            ? "Browser notifications are blocked in your site settings."
                            : pushPermission === "unsupported"
                              ? "This browser does not support push notifications."
                              : "Browser notifications have not been enabled yet."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={() => void enableBrowserPush()}
                      disabled={
                        busyKey === "browser-push" ||
                        pushPermission === "granted" ||
                        pushPermission === "unsupported"
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lethela-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyKey === "browser-push" ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                      {pushPermission === "granted"
                        ? "Notifications enabled"
                        : "Enable on this device"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void disableBrowserPush()}
                      disabled={busyKey === "browser-push" || pushPermission === "unsupported"}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <BellOff className="h-4 w-4" />
                      Disable on this device
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </>
      )}

      {status && snapshot ? (
        <div
          role="status"
          className={`border-t px-5 py-4 text-sm sm:px-6 ${
            status.tone === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {status.message}
        </div>
      ) : null}
    </div>
  );
}
