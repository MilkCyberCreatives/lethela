"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

type Msg = { role: "user" | "assistant"; content: string; rich?: React.ReactNode };
type SupportSource = { q: string; snippet?: string; score: number };
type SupportPayload = { ok?: boolean; answer?: string; sources?: SupportSource[] };
type SearchHit = {
  id: string;
  kind: "vendor" | "product";
  title: string;
  subtitle?: string;
  image?: string;
  slug?: string;
  vendor?: string;
  priceCents?: number;
};
type SearchPayload = { ok?: boolean; results?: SearchHit[] };

const QUICK_PROMPTS = [
  "Popular tonight",
  "How do vendors join?",
  "Order via WhatsApp",
  "Track order LET-12345",
  "How does Ozow payment work?",
] as const;
const AUTO_CLOSE_MS = 12000;

function matchOrderId(text: string) {
  const match = text.match(/LET[-\s]?\d{4,8}/i);
  return match?.[0]?.replace(/\s/g, "").toUpperCase() ?? null;
}

function highlight(text: string, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return text;

  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${terms.map(escape).join("|")})`, "gi");
  const pieces = text.split(re);
  return pieces.map((piece, idx) =>
    terms.includes(piece.toLowerCase()) ? (
      <mark key={idx} className="rounded bg-white/20 px-0.5">
        {piece}
      </mark>
    ) : (
      piece
    )
  );
}

export default function AIChatWidget() {
  const whatsappLink = `https://wa.me/${getOrderWhatsAppPhone()}`;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! I am your Lethela assistant. I can help with ordering, tracking (LET-12345), Ozow payments, WhatsApp orders, vendor onboarding, rider applications, dashboard questions, and support.",
    },
  ]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const msgsRef = useRef<Msg[]>(msgs);
  const autoCloseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [msgs, open]);

  useEffect(() => {
    msgsRef.current = msgs;
  }, [msgs]);

  useEffect(() => {
    const clearAutoCloseTimer = () => {
      if (autoCloseTimeoutRef.current != null) {
        window.clearTimeout(autoCloseTimeoutRef.current);
        autoCloseTimeoutRef.current = null;
      }
    };

    if (!open) {
      clearAutoCloseTimer();
      return;
    }

    inputRef.current?.focus();

    const scheduleAutoClose = () => {
      clearAutoCloseTimer();
      autoCloseTimeoutRef.current = window.setTimeout(() => {
        setOpen(false);
      }, AUTO_CLOSE_MS);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearAutoCloseTimer();
        setOpen(false);
      }
    };

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (widgetRef.current?.contains(target) || launcherRef.current?.contains(target)) {
        scheduleAutoClose();
        return;
      }
      clearAutoCloseTimer();
      setOpen(false);
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (widgetRef.current?.contains(target) || launcherRef.current?.contains(target)) {
        scheduleAutoClose();
        return;
      }
      clearAutoCloseTimer();
      setOpen(false);
    };

    const onPageScroll = () => {
      clearAutoCloseTimer();
      setOpen(false);
    };

    const widgetNode = widgetRef.current;
    const resetOnWidgetActivity = () => scheduleAutoClose();

    scheduleAutoClose();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onPageScroll, true);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    widgetNode?.addEventListener("mousemove", resetOnWidgetActivity);
    widgetNode?.addEventListener("keydown", resetOnWidgetActivity);
    widgetNode?.addEventListener("input", resetOnWidgetActivity);
    return () => {
      clearAutoCloseTimer();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onPageScroll, true);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
      widgetNode?.removeEventListener("mousemove", resetOnWidgetActivity);
      widgetNode?.removeEventListener("keydown", resetOnWidgetActivity);
      widgetNode?.removeEventListener("input", resetOnWidgetActivity);
    };
  }, [open]);

  function appendAssistant(content: string, rich?: React.ReactNode) {
    setMsgs((current) => [...current, { role: "assistant", content, rich }]);
  }

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || busy) return;

    const next = [...msgsRef.current, { role: "user", content: text } as Msg];
    setMsgs(next);
    setInput("");
    setBusy(true);
    setOpen(true);

    try {
      const orderId = matchOrderId(text);
      const wantsTracking = /where'?s my order|track|status/i.test(text);
      if (orderId || wantsTracking) {
        if (!orderId) {
          appendAssistant("Please share your order reference (example LET-12345), or use the Track Order page: /track");
          return;
        }
        const id = orderId;
        const response = await fetch(`/api/orders/status?id=${encodeURIComponent(id)}`);
        const json = await response.json().catch(() => ({}));
        if (json?.ok) {
          const content = `Order ${json.order.id} - ${json.order.status.replaceAll("_", " ")}.\nETA: ${json.order.eta} from ${json.order.vendor}.`;
          appendAssistant(`${content}\nNeed help? Message Lethela on WhatsApp: ${whatsappLink}`);
        } else {
          appendAssistant("I could not find that order. Please check your order ID (example: LET-12345).");
        }
        return;
      }

      const recommendationIntent =
        /recommend|suggest|hungry|what should i eat|kota|chips|burger|pizza|grocer|groceries|vegan|halaal|chicken/i.test(text);
      if (recommendationIntent) {
        const response = await fetch("/api/ai/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ q: text }),
        });
        const json = (await response.json().catch(() => ({}))) as SearchPayload;
        const top = Array.isArray(json.results) ? json.results.slice(0, 3) : [];
        if (top.length > 0) {
          const rich = (
            <div className="space-y-2">
              <div className="text-xs text-white/80">Top picks</div>
              {top.map((item) => {
                const href = item.slug ? `/vendors/${item.slug}` : "#";
                return (
                  <a
                    key={`${item.kind}-${item.id}`}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="block rounded border border-white/10 bg-white/5 p-2 text-xs hover:border-white/30"
                  >
                    <div className="font-medium">{item.title}</div>
                    <div className="text-white/70">
                      {item.subtitle || item.vendor || item.kind}
                      {item.priceCents ? ` - R${(item.priceCents / 100).toFixed(2)}` : ""}
                    </div>
                  </a>
                );
              })}
            </div>
          );
          appendAssistant("Here are some options you can order right now.", rich);
        } else {
          appendAssistant(
            response.ok
              ? "I could not find matching options right now. Try another category or area."
              : "Search is unavailable right now. Please try again or use WhatsApp support."
          );
        }
        return;
      }

      if (/refund|refunds|cancel|cancellation|coverage|available|alcohol|beer|wine|cider|contact|help|support|delivery|time|eta|whatsapp|cash|offline/i.test(text)) {
        const response = await fetch("/api/ai/support", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ q: text }),
        });
        const json = (await response.json().catch(() => ({}))) as SupportPayload;

        const rich = (
          <div>
            <div className="mb-2">{highlight(json?.answer || "Here to help.", text)}</div>
            {Array.isArray(json?.sources) && json.sources.length > 0 ? (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-white/60">Sources</div>
                {json.sources.map((source, index: number) => (
                  <div key={index} className="rounded border border-white/10 bg-white/5 p-2 text-xs">
                    <div className="font-medium">{source.q}</div>
                    {source.snippet ? <div className="mt-1 text-white/80">{highlight(source.snippet, text)}</div> : null}
                    <div className="mt-1 text-[10px] text-white/50">Match: {(source.score * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );

        appendAssistant(json?.answer || "Here to help.", rich);
        return;
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });
      const json = await response.json().catch(() => ({}));
      appendAssistant(response.ok ? json.reply || "Sorry, try again." : "The assistant is temporarily unavailable. Please try again.");
    } catch {
      appendAssistant("Network error, please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        ref={launcherRef}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        className="fixed bottom-5 right-4 z-[81] flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-lethela-primary hover:opacity-95 md:bottom-24 md:right-5 md:h-14 md:w-14"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="currentColor" aria-hidden>
          <path d="M12 2a5 5 0 0 1 5 5h3a1 1 0 1 1 0 2h-1.06A8 8 0 1 1 5 17H3a1 1 0 1 1 0-2h3a5 5 0 0 1 6-13Z" />
        </svg>
      </button>

      {open ? (
        <div
          ref={widgetRef}
          className="fixed inset-x-3 bottom-20 z-[82] rounded-2xl border border-white/10 bg-lethela-secondary md:inset-x-auto md:bottom-24 md:right-5 md:w-[90vw] md:max-w-sm"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="font-semibold">Lethela Assistant</div>
            <div className="flex items-center gap-3">
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="text-xs underline">
                WhatsApp us
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Lethela Assistant"
                className="rounded-md p-1 text-white/80 transition hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-b border-white/10 px-3 py-3">
            {QUICK_PROMPTS.map((query) => (
              <button
                key={query}
                onClick={() => void send(query)}
                disabled={busy}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs hover:bg-white/15 disabled:opacity-60"
              >
                {query}
              </button>
            ))}
          </div>
          <div ref={scrollerRef} className="max-h-[50vh] space-y-2 overflow-y-auto p-3">
            {msgs.map((msg, index) => (
              <div key={index} className={msg.role === "user" ? "text-right" : ""}>
                <div
                  className={`inline-block whitespace-pre-wrap rounded-lg px-3 py-2 ${
                    msg.role === "user" ? "bg-white text-black" : "bg-white/10 text-white"
                  }`}
                >
                  {msg.rich ?? msg.content}
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-white/10 p-3"
          >
            <input
              ref={inputRef}
              className="flex-1 rounded-md bg-white px-3 py-2 text-sm text-black outline-none"
              placeholder="Ask about orders, vendors, riders, dashboard, or support..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-md bg-lethela-primary px-3 py-2 text-sm disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
