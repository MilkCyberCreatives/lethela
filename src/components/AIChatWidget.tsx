"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

type AssistantMode = "tracking" | "recommendations" | "support" | "general";

type SupportSource = { q: string; snippet?: string; score: number };
type SearchHit = {
  id: string;
  kind: "vendor" | "product";
  title: string;
  subtitle?: string | null;
  image?: string | null;
  slug?: string | null;
  vendor?: string | null;
  priceCents?: number | null;
};

type OrderSummary = {
  id: string;
  status: string;
  eta: string;
  vendor: string;
  progressPct: number;
  href: string;
};

type AssistantReply = {
  ok?: boolean;
  mode?: AssistantMode;
  reply?: string;
  results?: SearchHit[];
  sources?: SupportSource[];
  followUps?: string[];
  order?: OrderSummary;
  cta?: { label: string; href: string; external?: boolean };
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  meta?: AssistantReply;
};

const QUICK_PROMPTS = [
  "Popular tonight",
  "Track order LET-12345",
  "How do vendors join?",
  "Order via WhatsApp",
] as const;

const STORAGE_KEY = "lethela-assistant-thread-v2";

function formatPrice(priceCents?: number | null) {
  if (typeof priceCents !== "number") return null;
  return `R${(priceCents / 100).toFixed(2)}`;
}

const INITIAL_THREAD: Msg[] = [
  {
    role: "assistant",
    content:
      "Hi! I am your Lethela assistant. I can help with live order tracking, recommendations, WhatsApp orders, vendor onboarding, rider applications, and support.",
    meta: {
      mode: "general",
      followUps: ["Popular tonight", "Track order LET-12345", "Order via WhatsApp"],
    },
  },
];

export default function AIChatWidget() {
  const whatsappLink = `https://wa.me/${getOrderWhatsAppPhone()}`;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>(() => INITIAL_THREAD);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const msgsRef = useRef<Msg[]>(msgs);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Msg[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMsgs(parsed);
      }
    } catch {
      // ignore bad session payloads
    }
  }, []);

  useEffect(() => {
    msgsRef.current = msgs;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
    } catch {
      // ignore session storage errors
    }
  }, [msgs]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (widgetRef.current?.contains(target) || launcherRef.current?.contains(target)) return;
      setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const lastAssistant = useMemo(() => [...msgs].reverse().find((msg) => msg.role === "assistant"), [msgs]);
  const followUps = lastAssistant?.meta?.followUps || [];

  function appendAssistant(content: string, meta?: AssistantReply) {
    setMsgs((current) => [...current, { role: "assistant", content, meta }]);
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
      const json = (await response.json().catch(() => ({}))) as AssistantReply;
      appendAssistant(
        response.ok
          ? json.reply || "I can help with orders, tracking, recommendations, and support."
          : "The assistant is temporarily unavailable. Please try again.",
        response.ok ? json : undefined
      );
    } catch {
      appendAssistant("Network error. Please try again, or use WhatsApp support if it is urgent.");
    } finally {
      setBusy(false);
    }
  }

  function resetThread() {
    setMsgs(INITIAL_THREAD);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_THREAD));
    } catch {
      // ignore
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
              <button
                type="button"
                onClick={resetThread}
                className="text-xs underline"
              >
                Reset
              </button>
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
                  className={`inline-block max-w-full whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user" ? "bg-white text-black" : "bg-white/10 text-white"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "assistant" && msg.meta ? <AssistantMeta meta={msg.meta} /> : null}
              </div>
            ))}
            {busy ? (
              <div>
                <div className="inline-block whitespace-pre-wrap rounded-lg bg-white/10 px-3 py-2 text-sm text-white">
                  Lethela is thinking...
                </div>
              </div>
            ) : null}
          </div>

          {followUps.length > 0 ? (
            <div className="border-t border-white/10 px-3 py-3">
              <div className="flex flex-wrap gap-2">
                {followUps.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => void send(item)}
                    disabled={busy}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs hover:bg-white/15 disabled:opacity-60"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
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

function AssistantMeta({ meta }: { meta: AssistantReply }) {
  return (
    <div className="mt-2 space-y-2 text-left">
      {meta.order ? (
        <div className="rounded border border-white/10 bg-white/5 p-2 text-xs">
          <div className="font-medium">{meta.order.id}</div>
          <div className="mt-1 text-white/70">
            {meta.order.status.replaceAll("_", " ")} | ETA {meta.order.eta} | {meta.order.vendor}
          </div>
          <div className="mt-2">
            <Link href={meta.order.href} className="underline">
              Open live tracking
            </Link>
          </div>
        </div>
      ) : null}

      {Array.isArray(meta.results) && meta.results.length > 0 ? (
        <div className="space-y-2">
          {meta.results.map((item) => {
            const href = item.slug ? `/vendors/${item.slug}` : "/search";
            return (
              <Link
                key={`${item.kind}-${item.id}`}
                href={href}
                className="block rounded border border-white/10 bg-white/5 p-2 text-xs hover:border-white/30"
              >
                <div className="font-medium">{item.title}</div>
                <div className="text-white/70">
                  {item.subtitle || item.vendor || item.kind}
                  {formatPrice(item.priceCents) ? ` | ${formatPrice(item.priceCents)}` : ""}
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      {Array.isArray(meta.sources) && meta.sources.length > 0 ? (
        <div className="space-y-1">
          <div className="text-xs text-white/60">Sources</div>
          {meta.sources.map((source, index) => (
            <div key={`${source.q}-${index}`} className="rounded border border-white/10 bg-white/5 p-2 text-xs">
              <div className="font-medium">{source.q}</div>
              {source.snippet ? <div className="mt-1 text-white/80">{source.snippet}</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      {meta.cta ? (
        meta.cta.external ? (
          <a href={meta.cta.href} target="_blank" rel="noreferrer" className="inline-block text-xs underline">
            {meta.cta.label}
          </a>
        ) : (
          <Link href={meta.cta.href} className="inline-block text-xs underline">
            {meta.cta.label}
          </Link>
        )
      ) : null}
    </div>
  );
}
