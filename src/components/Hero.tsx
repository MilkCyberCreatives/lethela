"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Mic, Search } from "lucide-react";

type Suggestion = {
  id: string;
  kind: "vendor" | "product";
  title: string;
  image?: string | null;
  slug?: string | null;
  vendorName?: string | null;
  score: number;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export default function Hero() {
  const [q, setQ] = useState("");
  const [resp, setResp] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [suggests, setSuggests] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const acRef = useRef<HTMLDivElement>(null);
  const blurTimeout = useRef<any>(null);
  const suggestionCache = useRef<Map<string, Suggestion[]>>(new Map());

  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const runSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q }),
      });
      const data = await response.json();
      setResp(data);
    } catch {
      setResp({ ok: false, error: "Search failed" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setSuggests([]);
      setOpen(false);
      return;
    }

    const cacheKey = text.toLowerCase();
    const cached = suggestionCache.current.get(cacheKey);
    if (cached) {
      setSuggests(cached);
      setOpen(cached.length > 0);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch("/api/ai/semantic-search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ q: text }),
          signal: controller.signal,
        });
        const json = await response.json();
        const results = Array.isArray(json?.results) ? json.results : [];
        suggestionCache.current.set(cacheKey, results);
        setSuggests(results);
        setOpen(results.length > 0);
      } catch {
        // ignore
      }
    }, 320);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [q]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!acRef.current) return;
      if (!acRef.current.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-ZA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const text = event.results[0][0].transcript;
      setQ(text);
    };
    recognition.onend = () => setListening(false);
    recRef.current = recognition;
  }, []);

  const startListening = () => {
    if (!recRef.current) {
      alert("Voice search not supported on this browser.");
      return;
    }

    try {
      setListening(true);
      recRef.current.start();
    } catch {
      setListening(false);
    }
  };

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: "url('/hero.jpg')" }}
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

      <div className="relative container grid gap-10 py-12 md:grid-cols-2 md:py-20">
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
            Lethela - <span className="text-lethela-primary">Siyashesha</span>
          </h1>
          <p className="mt-4 text-white/80 max-w-xl">
            Fast deliveries in <span className="font-semibold text-white">Klipfontein View, Midrand 1685</span>.
          </p>

          <div className="mt-6 flex flex-col gap-3" ref={acRef}>
            <form
              className="relative flex w-full max-w-xl items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setOpen(false);
                void runSearch();
              }}
              aria-label="AI search with autocomplete"
            >
              <div className="relative flex-1">
                <Input
                  placeholder="Ask AI: vegan curry near Midrand"
                  value={q}
                  onFocus={() => suggests.length > 0 && setOpen(true)}
                  onChange={(event) => setQ(event.target.value)}
                  onBlur={() => {
                    blurTimeout.current = setTimeout(() => setOpen(false), 120);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setOpen(false);
                  }}
                  className="bg-white text-black pr-10"
                  aria-label="AI search query"
                />
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-black/60 pointer-events-none" />
                {open && suggests.length > 0 ? (
                  <div
                    role="listbox"
                    className="absolute mt-1 w-full rounded-lg border border-white/10 bg-lethela-secondary shadow-2xl z-10"
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    {suggests.map((suggestion) => {
                      const href =
                        suggestion.kind === "vendor" && suggestion.slug
                          ? `/vendors/${suggestion.slug}`
                          : suggestion.slug
                            ? `/vendors/${suggestion.slug}`
                            : "#";

                      return (
                        <Link
                          key={`${suggestion.kind}-${suggestion.id}`}
                          href={href}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-white/5"
                          onClick={() => setOpen(false)}
                        >
                          {suggestion.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt="" src={suggestion.image} className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-white/10" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-sm font-medium">{suggestion.title}</div>
                            <div className="truncate text-[11px] text-white/70">
                              {suggestion.kind === "vendor"
                                ? "Vendor"
                                : `Product${suggestion.vendorName ? ` - ${suggestion.vendorName}` : ""}`}
                            </div>
                          </div>
                          <span className="text-[10px] text-white/50">~{(suggestion.score * 100).toFixed(0)}%</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <Button
                type="button"
                onClick={startListening}
                className={`bg-lethela-secondary text-white border border-white/20 hover:bg-lethela-secondary ${listening ? "opacity-80" : ""}`}
                aria-label="Voice search"
                title="Voice search"
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-lethela-primary disabled:opacity-60"
                aria-label="Search"
              >
                {loading ? "Thinking..." : "Ask AI"}
              </Button>
            </form>

            <div className="flex items-center gap-2 text-xs text-white/70">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 px-3 h-8" type="button">
                <MapPin className="h-3.5 w-3.5 mr-2" />
                Enter address
              </Button>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 px-3 h-8" type="button">
                <Navigation className="h-3.5 w-3.5 mr-2" />
                Use my location
              </Button>
            </div>
          </div>

          {resp ? (
            <div className="mt-6 rounded-xl border border-white/10 bg-lethela-secondary p-4 text-sm shadow-lg shadow-black/20">
              <div className="text-white/85 font-medium">AI results:</div>
              <pre className="mt-2 max-h-56 overflow-auto text-xs text-white/85">
                {JSON.stringify(resp, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>

        <div className="hidden md:flex items-center justify-center">
          <div className="card-glass w-full max-w-md rounded-2xl p-6 transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30">
            <p className="text-sm text-white/80">Set your area to see nearby options.</p>
            <div className="mt-3 h-28 rounded-xl bg-white/10" />
            <p className="mt-4 text-xs text-white/70">Built for South Africa • Performance-first</p>
          </div>
        </div>
      </div>
    </section>
  );
}
