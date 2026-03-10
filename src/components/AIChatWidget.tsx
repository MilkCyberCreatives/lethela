"use client";

import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [msgs, open]);

  async function send() {
    const text = input.trim();
    if (!text) return;

    const next = [...msgs, { role: "user", content: text } as Msg];
    setMsgs(next);
    setInput("");
    setBusy(true);

    try {
      const orderId = matchOrderId(text);
      const wantsTracking = /where'?s my order|track|status/i.test(text);
      if (orderId || wantsTracking) {
        if (!orderId) {
          setMsgs((current) => [
            ...current,
            {
              role: "assistant",
              content: "Please share your order reference (example LET-12345), or use the Track Order page: /track",
            },
          ]);
          return;
        }
        const id = orderId;
        const response = await fetch(`/api/orders/status?id=${encodeURIComponent(id)}`);
        const json = await response.json();
        if (json?.ok) {
          const content = `Order ${json.order.id} - ${json.order.status.replaceAll("_", " ")}.\nETA: ${json.order.eta} from ${json.order.vendor}.`;
          setMsgs((current) => [
            ...current,
            {
              role: "assistant",
              content: `${content}\nNeed help? Message Lethela on WhatsApp: ${whatsappLink}`,
            },
          ]);
        } else {
          setMsgs((current) => [
            ...current,
            {
              role: "assistant",
              content: "I could not find that order. Please check your order ID (example: LET-12345).",
            },
          ]);
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
        const json = (await response.json()) as SearchPayload;
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
          setMsgs((current) => [
            ...current,
            { role: "assistant", content: "Here are some options you can order right now.", rich },
          ]);
        } else {
          setMsgs((current) => [
            ...current,
            { role: "assistant", content: "I could not find matching options right now. Try another category or area." },
          ]);
        }
        return;
      }

      if (/refund|refunds|cancel|cancellation|coverage|available|alcohol|beer|wine|cider|contact|help|support|delivery|time|eta|whatsapp|cash|offline/i.test(text)) {
        const response = await fetch("/api/ai/support", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ q: text }),
        });
        const json = (await response.json()) as SupportPayload;

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

        setMsgs((current) => [...current, { role: "assistant", content: json?.answer || "Here to help.", rich }]);
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
      const json = await response.json();
      setMsgs((current) => [...current, { role: "assistant", content: json.reply || "Sorry, try again." }]);
    } catch {
      setMsgs((current) => [...current, { role: "assistant", content: "Network error, please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open ? (
        <div className="fixed bottom-[calc(24rem+90px)] right-5 z-[82] hidden gap-2 md:flex">
          {[
            "Popular tonight",
            "How do vendors join?",
            "Order via WhatsApp",
            "Track order LET-12345",
            "How does Ozow payment work?",
          ].map((query) => (
            <button
              key={query}
              onClick={() => setInput(query)}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs hover:bg-white/15"
            >
              {query}
            </button>
          ))}
        </div>
      ) : null}

      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Open AI assistant"
        className="fixed bottom-24 right-5 z-[81] flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-lethela-primary hover:opacity-95"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="currentColor" aria-hidden>
          <path d="M12 2a5 5 0 0 1 5 5h3a1 1 0 1 1 0 2h-1.06A8 8 0 1 1 5 17H3a1 1 0 1 1 0-2h3a5 5 0 0 1 6-13Z" />
        </svg>
      </button>

      {open ? (
        <div className="fixed bottom-24 right-5 z-[82] w-[90vw] max-w-sm rounded-2xl border border-white/10 bg-lethela-secondary">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="font-semibold">Lethela Assistant</div>
            <a href={whatsappLink} target="_blank" rel="noreferrer" className="text-xs underline">
              WhatsApp us
            </a>
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
              className="flex-1 rounded-md bg-white px-3 py-2 text-sm text-black outline-none"
              placeholder="Ask about orders, vendors, riders, dashboard, or support..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" disabled={busy} className="rounded-md bg-lethela-primary px-3 py-2 text-sm disabled:opacity-60">
              Send
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
