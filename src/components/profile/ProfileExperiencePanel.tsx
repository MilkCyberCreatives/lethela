"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/format";
import { pushDataLayerEvent, registerPushSubscription, trackVisitorEvent, unregisterPushSubscription } from "@/lib/visitor";
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

const preferenceLabels: Array<{
  key: keyof ExperienceSnapshot["pushPreferences"];
  label: string;
}> = [
  { key: "marketingEnabled", label: "Marketing alerts" },
  { key: "orderUpdatesEnabled", label: "Order updates" },
  { key: "recommendationsEnabled", label: "Recommendations" },
  { key: "adminAlertsEnabled", label: "Admin alerts" },
];

export default function ProfileExperiencePanel() {
  const add = useCart((state) => state.add);
  const clear = useCart((state) => state.clear);
  const [snapshot, setSnapshot] = useState<ExperienceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pushPermission, setPushPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );

  const favoriteCountLabel = useMemo(() => snapshot?.favorites.length ?? 0, [snapshot]);

  async function load() {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/me/experience", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load your experience.");
      }
      setSnapshot(json.snapshot);
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to load your experience.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function savePreference(key: keyof ExperienceSnapshot["pushPreferences"], value: boolean) {
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
        throw new Error(json.error || "Could not save push preferences.");
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
          : current
      );
      setStatus("Preferences updated.");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Could not save push preferences.");
    } finally {
      setBusyKey(null);
    }
  }

  async function enableBrowserPush() {
    setBusyKey("browser-push");
    setStatus(null);
    try {
      const result = await registerPushSubscription();
      if (!result.ok) {
        throw new Error("Push could not be enabled on this browser.");
      }
      setPushPermission(typeof Notification !== "undefined" ? Notification.permission : "granted");
      setStatus("Browser push enabled.");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Push could not be enabled.");
    } finally {
      setBusyKey(null);
    }
  }

  async function disableBrowserPush() {
    setBusyKey("browser-push");
    setStatus(null);
    try {
      await unregisterPushSubscription();
      setStatus("Browser push disabled for this device.");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Push could not be disabled.");
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
        item.qty
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
    setStatus("Cart updated from your recent order.");
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-white/60">Customer memory</p>
            <h2 className="mt-2 text-xl font-semibold">Your saved activity</h2>
            <p className="mt-2 text-sm text-white/75">
              Favorites, ratings, reorder shortcuts, and browser notification settings.
            </p>
          </div>
          {!loading && snapshot ? (
            <div className="flex flex-wrap gap-2 text-xs text-white/70">
              <span className="rounded-full border border-white/15 px-3 py-1">{favoriteCountLabel} saved meals</span>
              <span className="rounded-full border border-white/15 px-3 py-1">
                {snapshot.reviewSummary.averageRating != null
                  ? `${snapshot.reviewSummary.averageRating.toFixed(1)} avg rating`
                  : "No ratings yet"}
              </span>
              <span className="rounded-full border border-white/15 px-3 py-1">
                {snapshot.recentOrders.length} recent orders
              </span>
            </div>
          ) : null}
        </div>

        {loading ? <p className="mt-4 text-sm text-white/70">Loading saved activity...</p> : null}

        {!loading && snapshot ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr,1fr]">
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/65">Saved meals</h3>
                {snapshot.favorites.length === 0 ? (
                  <p className="mt-3 text-sm text-white/65">Your saved meals will appear here.</p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {snapshot.favorites.map((favorite) => (
                      <Link
                        key={favorite.productId}
                        href={`/vendors/${favorite.vendorSlug}`}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3"
                      >
                        {favorite.productImage ? (
                          <div className="relative h-14 w-14 overflow-hidden rounded-lg">
                            <Image src={favorite.productImage} alt={favorite.productName} fill sizes="56px" className="object-cover" />
                          </div>
                        ) : (
                          <div className="h-14 w-14 rounded-lg bg-white/10" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">{favorite.productName}</div>
                          <div className="truncate text-xs text-white/65">{favorite.vendorName}</div>
                          <div className="mt-1 text-xs text-white/80">{formatZAR(favorite.priceCents)}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/65">Recent orders</h3>
                {snapshot.recentOrders.length === 0 ? (
                  <p className="mt-3 text-sm text-white/65">Your confirmed orders will appear here.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {snapshot.recentOrders.map((order) => (
                      <div key={order.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-white">{order.vendorName}</div>
                            <div className="mt-1 text-xs text-white/65">
                              {new Date(order.createdAt).toLocaleString()} • {order.publicId}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-white">{formatZAR(order.totalCents)}</div>
                            <div className="mt-2 flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="border-white/20 text-white"
                                onClick={() => reorder(order)}
                              >
                                Reorder
                              </Button>
                              <Link href={`/orders/${order.publicId}`} className="rounded border border-white/20 px-3 py-2 text-xs text-white">
                                Track
                              </Link>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
                          {order.items.slice(0, 4).map((item, index) => (
                            <span key={`${order.id}-${index}`} className="rounded-full border border-white/10 px-3 py-1">
                              {item.qty}x {item.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/65">Push preferences</h3>
                <div className="mt-4 space-y-3">
                  {preferenceLabels.map((item) => (
                    <label key={item.key} className="flex items-center justify-between gap-4 text-sm text-white/85">
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={snapshot.pushPreferences[item.key]}
                        onChange={(event) => void savePreference(item.key, event.target.checked)}
                        disabled={busyKey === item.key}
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/20 text-white"
                    onClick={() => void enableBrowserPush()}
                    disabled={busyKey === "browser-push" || pushPermission === "granted"}
                  >
                    {pushPermission === "granted" ? "Browser push enabled" : "Enable browser push"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/20 text-white"
                    onClick={() => void disableBrowserPush()}
                    disabled={busyKey === "browser-push"}
                  >
                    Disable on this device
                  </Button>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {status ? <p className="mt-4 text-sm text-white/75">{status}</p> : null}
      </div>
    </div>
  );
}
