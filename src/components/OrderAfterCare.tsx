"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, RotateCcw, Share2, Star } from "lucide-react";
import { useCart } from "@/store/cart";
import { buildWhatsAppSupportLink } from "@/lib/support";
import { pushDataLayerEvent } from "@/lib/visitor";

type AfterCareItem = {
  itemId?: string;
  name?: string;
  qty?: number;
  priceCents?: number;
  isAlcohol?: boolean;
};

type Feedback = { storeRating: number; riderRating: number | null; comment: string } | null;

const buttonClass =
  "inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

// Share, help and "order again" buttons under the order tracking summary.
export function OrderActions(props: {
  reference: string;
  sharePath?: string | null;
  isFinished: boolean;
  vendorId?: string | null;
  vendorSlug?: string | null;
  vendorName?: string | null;
  items: AfterCareItem[];
}) {
  const router = useRouter();
  const clear = useCart((state) => state.clear);
  const add = useCart((state) => state.add);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const helpLink = buildWhatsAppSupportLink(
    `Hello Lethela, I need help with my order ${props.reference}.`,
  );
  const reorderable =
    props.isFinished &&
    Boolean(props.vendorId && props.vendorSlug) &&
    props.items.some((item) => item.itemId && item.name);

  async function share() {
    if (!props.sharePath) return;
    const url = `${window.location.origin}${props.sharePath}`;
    const text = `Follow my Lethela delivery from ${props.vendorName || "the store"}:`;
    pushDataLayerEvent("share_tracking");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Lethela order tracking", text, url });
        return;
      }
    } catch {
      // The person closed the share sheet; fall through to WhatsApp.
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setShareNote("Opened WhatsApp with the tracking link.");
  }

  function orderAgain() {
    if (!props.vendorId || !props.vendorSlug) return;
    clear();
    for (const item of props.items) {
      if (!item.itemId || !item.name) continue;
      add(
        {
          itemId: item.itemId,
          vendorId: props.vendorId,
          vendorSlug: props.vendorSlug,
          name: item.name,
          priceCents: item.priceCents || 0,
          isAlcohol: Boolean(item.isAlcohol),
        },
        item.qty || 1,
      );
    }
    pushDataLayerEvent("reorder", { vendor_slug: props.vendorSlug });
    router.push(`/vendors/${props.vendorSlug}?reorder=1`);
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3" aria-label="Order actions">
      {!props.isFinished && props.sharePath ? (
        <button type="button" className={buttonClass} onClick={() => void share()}>
          <Share2 className="h-4 w-4" aria-hidden="true" /> Share tracking
        </button>
      ) : null}
      {reorderable ? (
        <button type="button" className={buttonClass} onClick={orderAgain}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Order again
        </button>
      ) : null}
      <a href={helpLink} target="_blank" rel="noreferrer" className={buttonClass}>
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> Get help with this order
      </a>
      {shareNote ? <p className="w-full text-xs text-white/65">{shareNote}</p> : null}
    </div>
  );
}

function StarPicker(props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-medium text-white">{props.label}</legend>
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label={props.label}>
        {[1, 2, 3, 4, 5].map((value) => {
          const active = value <= props.value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={props.value === value}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              disabled={props.disabled}
              onClick={() => props.onChange(value)}
              className="rounded-md p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <Star
                className={`h-7 w-7 ${active ? "fill-lethela-primary text-lethela-primary" : "text-white/40"}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// "How was your order?" once an order is delivered: rate the store and the rider once.
export function OrderRatingCard(props: {
  reference: string;
  trackingToken?: string;
  vendorName?: string | null;
  hasRider: boolean;
  canRate: boolean;
  feedback: Feedback;
  onRated?: () => void;
}) {
  const [storeRating, setStoreRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Feedback>(props.feedback);

  if (saved) {
    return (
      <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4">
        <div className="font-semibold">Thank you for rating this order</div>
        <p className="mt-2 text-sm text-white/75">
          Store: {saved.storeRating}/5
          {saved.riderRating != null ? ` · Rider: ${saved.riderRating}/5` : ""}
        </p>
        {saved.comment ? <p className="mt-2 text-sm text-white/65">“{saved.comment}”</p> : null}
      </div>
    );
  }

  if (!props.canRate) return null;

  async function submit() {
    if (storeRating < 1) {
      setError("Choose how many stars to give the store.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(props.reference)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeRating,
          riderRating: props.hasRider && riderRating > 0 ? riderRating : null,
          comment: comment.trim(),
          t: props.trackingToken || "",
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Could not save your rating. Please try again.");
      }
      pushDataLayerEvent("rate_order", { rating: storeRating });
      setSaved({
        storeRating,
        riderRating: props.hasRider && riderRating > 0 ? riderRating : null,
        comment: comment.trim(),
      });
      props.onRated?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save your rating.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4" id="rate-order">
      <div className="font-semibold">How was your order?</div>
      <p className="mt-1 text-sm text-white/70">
        Your rating helps {props.vendorName || "the store"} and our riders get better. It takes a
        few seconds.
      </p>
      <StarPicker
        label={`Rate ${props.vendorName || "the store"}`}
        value={storeRating}
        onChange={setStoreRating}
        disabled={busy}
      />
      {props.hasRider ? (
        <StarPicker
          label="Rate your rider"
          value={riderRating}
          onChange={setRiderRating}
          disabled={busy}
        />
      ) : null}
      <label className="mt-4 block text-sm font-medium text-white" htmlFor="order-comment">
        Anything to add? (optional)
      </label>
      <textarea
        id="order-comment"
        value={comment}
        onChange={(event) => setComment(event.target.value.slice(0, 500))}
        rows={3}
        disabled={busy}
        className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50"
        placeholder="The food was hot and the rider was friendly."
      />
      <p className="mt-1 text-xs text-white/55">
        Your first name and comment may show on the store&apos;s page.
      </p>
      {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="mt-4 rounded-full bg-lethela-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Send rating"}
      </button>
    </div>
  );
}
