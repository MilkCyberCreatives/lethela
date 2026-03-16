"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Mic, Search } from "lucide-react";
import { formatZAR } from "@/lib/format";
import LocationPicker from "@/components/LocationPicker";
import { persistPreferredSuburb } from "@/lib/location-preference";

type Suggestion = {
  id: string;
  kind: "vendor" | "product";
  title: string;
  image?: string | null;
  slug?: string | null;
  vendorName?: string | null;
  score: number;
};

type SearchResult = {
  id: string;
  kind: "vendor" | "product";
  title: string;
  subtitle?: string;
  image?: string | null;
  slug?: string | null;
  vendor?: string | null;
  priceCents?: number;
};

type SearchResponse = {
  ok?: boolean;
  results?: SearchResult[];
  error?: string;
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
  const router = useRouter();
  const [q, setQ] = useState("");
  const [resp, setResp] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);

  const [suggests, setSuggests] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const acRef = useRef<HTMLDivElement>(null);
  const blurTimeout = useRef<any>(null);
  const suggestionCache = useRef<Map<string, Suggestion[]>>(new Map());

  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  const runSearch = async () => {
    setSearchNotice(null);
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
      setSearchNotice("Voice search is not supported on this browser.");
      return;
    }

    try {
      setSearchNotice(null);
      setListening(true);
      recRef.current.start();
    } catch {
      setListening(false);
    }
  };

  function applyLocation(suburb: string) {
    const savedSuburb = persistPreferredSuburb(suburb);
    if (!savedSuburb) return;
    setLocationNotice(`Showing options for ${savedSuburb}.`);
    setShowLocationPicker(false);
    router.refresh();
  }

  async function handleUseCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationNotice("Location services are not available on this device. Enter your area instead.");
      return;
    }

    setLocationLoading(true);
    setLocationNotice(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const response = await fetch(
        `/api/maps/reverse-geocode?lat=${position.coords.latitude}&lng=${position.coords.longitude}`,
        { cache: "no-store" }
      );
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok || !json?.suburb) {
        setLocationNotice("We could not detect your area. Enter your suburb manually instead.");
        return;
      }

      const nextArea = [json.suburb, json.city].filter(Boolean).join(", ");
      applyLocation(nextArea);
    } catch {
      setLocationNotice("Location permission was denied or unavailable. Enter your suburb manually instead.");
    } finally {
      setLocationLoading(false);
    }
  }

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
              <Button
                variant="outline"
                className="h-8 border-white/30 px-3 text-white hover:bg-white/10"
                type="button"
                onClick={() => {
                  setLocationNotice(null);
                  setShowLocationPicker((value) => !value);
                }}
              >
                <MapPin className="h-3.5 w-3.5 mr-2" />
                Enter address
              </Button>
              <Button
                variant="outline"
                className="h-8 border-white/30 px-3 text-white hover:bg-white/10"
                type="button"
                onClick={() => void handleUseCurrentLocation()}
                disabled={locationLoading}
              >
                <Navigation className="h-3.5 w-3.5 mr-2" />
                {locationLoading ? "Locating..." : "Use my location"}
              </Button>
            </div>
            {showLocationPicker ? (
              <LocationPicker onSaved={(savedSuburb) => setLocationNotice(`Showing options for ${savedSuburb}.`)} />
            ) : null}
            {locationNotice ? <p className="text-xs text-white/70">{locationNotice}</p> : null}
          </div>

          {searchNotice ? <p className="mt-4 text-sm text-white/70">{searchNotice}</p> : null}
          {resp ? (
            <div className="mt-6 rounded-xl border border-white/10 bg-lethela-secondary p-4 text-sm">
              <div className="text-white/85 font-medium">Search results</div>
              {resp.ok && Array.isArray(resp.results) && resp.results.length > 0 ? (
                <div className="mt-3 grid gap-3">
                  {resp.results.slice(0, 4).map((result) => {
                    const href = result.slug ? `/vendors/${result.slug}` : "/search";
                    return (
                      <Link
                        key={`${result.kind}-${result.id}`}
                        href={href}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 transition-colors hover:border-white/20"
                      >
                        <div className="text-sm font-medium text-white">{result.title}</div>
                        <div className="mt-1 text-xs text-white/70">
                          {result.subtitle || result.vendor || (result.kind === "vendor" ? "Vendor" : "Product")}
                        </div>
                        {typeof result.priceCents === "number" ? (
                          <div className="mt-2 text-xs font-medium text-white/85">{formatZAR(result.priceCents)}</div>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-xs text-white/75">{resp.error || "No matching options found yet."}</p>
              )}
              {resp.ok ? (
                <Link href={`/search?q=${encodeURIComponent(q)}`} className="mt-3 inline-flex text-xs underline">
                  View full results
                </Link>
              ) : null}
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
