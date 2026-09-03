"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Mic, Navigation, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatZAR } from "@/lib/format";
import type { MarketplaceLaunchStatus } from "@/lib/launch-readiness";
import { persistPreferredLocation, readPreferredLocation } from "@/lib/location-preference";
import { pushDataLayerEvent, trackVisitorEvent } from "@/lib/visitor";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-lg border border-white/15 bg-white/5 p-4 text-sm text-white/65"
      role="status"
    >
      Loading location search…
    </div>
  ),
});

type Suggestion = {
  id: string;
  kind: "vendor" | "product" | "category";
  title: string;
  image?: string | null;
  slug?: string | null;
  vendorName?: string | null;
  score: number;
  href?: string;
};

type SearchResult = {
  id: string;
  kind: "vendor" | "product" | "category";
  title: string;
  subtitle?: string;
  image?: string | null;
  slug?: string | null;
  vendor?: string | null;
  priceCents?: number;
  href?: string;
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

type HeroProps = {
  initialArea?: string | null;
  launchStatus?: MarketplaceLaunchStatus;
};

const fallbackLaunchStatus: MarketplaceLaunchStatus = {
  phase: "PRE_LAUNCH",
  eyebrow: "Launching shortly in Klipfontein View. Vendors and riders are joining now.",
  headline: "Township favourites, delivered fast.",
  description:
    "Order KoTa, chicken and everyday essentials from local stores, delivered by community riders.",
};

export default function Hero({
  initialArea = null,
  launchStatus = fallbackLaunchStatus,
}: HeroProps) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [resp, setResp] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [suggests, setSuggests] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const acRef = useRef<HTMLDivElement>(null);
  const blurTimeout = useRef<number | null>(null);
  const suggestionCache = useRef<Map<string, Suggestion[]>>(new Map());
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [activeArea, setActiveArea] = useState<string | null>(
    () => readPreferredLocation()?.label || initialArea || null,
  );

  useEffect(() => {
    const syncLocation = () => {
      const next = readPreferredLocation()?.label || initialArea || null;
      setActiveArea((current) => (current === next ? current : next));
    };

    syncLocation();
    window.addEventListener("lethela:location-changed", syncLocation);
    window.addEventListener("storage", syncLocation);
    window.addEventListener("focus", syncLocation);
    document.addEventListener("visibilitychange", syncLocation);
    return () => {
      window.removeEventListener("lethela:location-changed", syncLocation);
      window.removeEventListener("storage", syncLocation);
      window.removeEventListener("focus", syncLocation);
      document.removeEventListener("visibilitychange", syncLocation);
    };
  }, [initialArea]);

  const runSearch = async () => {
    const query = q.trim();
    if (query.length < 2) {
      setSearchNotice("Enter at least two letters to search.");
      return;
    }

    setSearchNotice(null);
    setLoading(true);
    try {
      void trackVisitorEvent({
        type: "search",
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
        searchQuery: query,
        preferredArea: activeArea,
      });
      pushDataLayerEvent("search", {
        search_term: query,
        preferred_area: activeArea,
      });
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: query }),
      });
      const data = (await response.json().catch(() => ({}))) as SearchResponse;
      setResp(response.ok ? data : { ok: false, error: data.error || "Search failed" });
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
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/ai/semantic-search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ q: text }),
          signal: controller.signal,
        });
        const json = await response.json().catch(() => ({}));
        const results = Array.isArray(json?.results) ? (json.results as Suggestion[]) : [];
        suggestionCache.current.set(cacheKey, results);
        setSuggests(results);
        setOpen(results.length > 0);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setSuggests([]);
      }
    }, 320);

    return () => {
      window.clearTimeout(timeoutId);
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
    return () => {
      if (blurTimeout.current) window.clearTimeout(blurTimeout.current);
    };
  }, []);

  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setVoiceSupported(false);
      return;
    }

    setVoiceSupported(true);
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-ZA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const text = event.results[0]?.[0]?.transcript || "";
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

  async function handleUseCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationNotice(
        "Location services are not available on this device. Enter your area instead.",
      );
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
        { cache: "no-store" },
      );
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok || !json?.suburb) {
        setLocationNotice("We could not detect your area. Enter your suburb manually instead.");
        return;
      }

      const savedLocation = persistPreferredLocation({
        label: [json.suburb, json.city].filter(Boolean).join(", "),
        suburb: String(json.suburb || ""),
        city: String(json.city || ""),
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        source: "device",
        accuracyMeters: position.coords.accuracy,
      });
      if (!savedLocation) {
        setLocationNotice(
          "We found your position but could not save it. Enter your suburb manually instead.",
        );
        return;
      }

      setLocationNotice(
        position.coords.accuracy && Number.isFinite(position.coords.accuracy)
          ? `Showing options for ${savedLocation.label}. Accuracy about ${Math.round(position.coords.accuracy)} m.`
          : `Showing options for ${savedLocation.label}.`,
      );
      pushDataLayerEvent("use_my_location", {
        preferred_area: savedLocation.label,
        accuracy_meters: position.coords.accuracy,
      });
      setShowLocationPicker(false);
      router.refresh();
    } catch {
      setLocationNotice(
        "Location permission was denied or unavailable. Enter your suburb manually instead.",
      );
    } finally {
      setLocationLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden">
      <Image
        aria-hidden
        src="/hero-lethela-branded.jpg"
        alt=""
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        quality={72}
        className="pointer-events-none object-cover object-center opacity-70"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-[#080B27]/95 via-[#080B27]/70 to-black/25"
      />

      <div className="relative container py-12 md:py-20">
        <div className="flex max-w-3xl flex-col items-start text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lethela-primary">
            {launchStatus.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            {launchStatus.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 md:text-lg">
            {launchStatus.description}
          </p>

          <div className="mt-8 flex w-full max-w-2xl flex-col gap-3" ref={acRef}>
            <form
              className="relative flex w-full items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setOpen(false);
                void runSearch();
              }}
              aria-label="AI search with autocomplete"
            >
              <div className="relative flex-1">
                <Input
                  placeholder="Search kota, groceries, chicken, spaza shops..."
                  value={q}
                  onFocus={() => suggests.length > 0 && setOpen(true)}
                  onChange={(event) => setQ(event.target.value)}
                  onBlur={() => {
                    blurTimeout.current = window.setTimeout(() => setOpen(false), 120);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setOpen(false);
                  }}
                  className="bg-white text-black pr-10"
                  aria-label="AI search query"
                />
                <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" />
                {open && suggests.length > 0 ? (
                  <div
                    role="listbox"
                    className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 bg-lethela-secondary shadow-2xl"
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    {suggests.map((suggestion) => {
                      const href =
                        suggestion.href ||
                        (suggestion.kind === "vendor" && suggestion.slug
                          ? `/vendors/${suggestion.slug}`
                          : suggestion.slug
                            ? `/vendors/${suggestion.slug}`
                            : null);

                      const content = (
                        <>
                          {suggestion.image ? (
                            <div className="relative h-8 w-8 overflow-hidden rounded">
                              <Image
                                alt=""
                                src={suggestion.image}
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded bg-white/10" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{suggestion.title}</div>
                            <div className="truncate text-[11px] text-white/70">
                              {suggestion.kind === "vendor"
                                ? "Vendor"
                                : `Product${suggestion.vendorName ? ` - ${suggestion.vendorName}` : ""}`}
                            </div>
                          </div>
                          <span className="text-[10px] text-white/50">
                            ~{(suggestion.score * 100).toFixed(0)}%
                          </span>
                        </>
                      );

                      return href ? (
                        <Link
                          key={`${suggestion.kind}-${suggestion.id}`}
                          href={href}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-white/5"
                          onClick={() => setOpen(false)}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div
                          key={`${suggestion.kind}-${suggestion.id}`}
                          className="flex items-center gap-3 px-3 py-2 text-white/80"
                        >
                          {content}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <Button
                type="button"
                onClick={startListening}
                disabled={!voiceSupported}
                className={`border border-white/20 bg-lethela-secondary text-white hover:bg-lethela-secondary ${listening ? "opacity-80" : ""}`}
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
                {loading ? "Searching..." : "Search"}
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
              <Button
                variant="outline"
                className="h-8 border-white/30 px-3 text-white hover:bg-white/10"
                type="button"
                onClick={() => {
                  setLocationNotice(null);
                  setShowLocationPicker((value) => !value);
                }}
              >
                <MapPin className="mr-2 h-3.5 w-3.5" />
                Enter address
              </Button>
              <Button
                variant="outline"
                className="h-8 border-white/30 px-3 text-white hover:bg-white/10"
                type="button"
                onClick={() => void handleUseCurrentLocation()}
                disabled={locationLoading}
              >
                <Navigation className="mr-2 h-3.5 w-3.5" />
                {locationLoading ? "Locating..." : "Use my location"}
              </Button>
            </div>
            {showLocationPicker ? (
              <LocationPicker
                onSaved={(savedSuburb) => {
                  setLocationNotice(`Showing options for ${savedSuburb}.`);
                  setShowLocationPicker(false);
                }}
              />
            ) : null}
            {locationNotice ? <p className="text-xs text-white/70">{locationNotice}</p> : null}
          </div>

          {searchNotice ? <p className="mt-4 text-sm text-white/70">{searchNotice}</p> : null}
          {resp ? (
            <div className="mt-6 w-full max-w-2xl rounded-xl border border-white/10 bg-lethela-secondary p-4 text-left text-sm">
              <div className="font-medium text-white/85">Search results</div>
              {resp.ok && Array.isArray(resp.results) && resp.results.length > 0 ? (
                <div className="mt-3 grid gap-3">
                  {resp.results.slice(0, 4).map((result) => {
                    const href =
                      result.href || (result.slug ? `/vendors/${result.slug}` : "/search");
                    return (
                      <Link
                        key={`${result.kind}-${result.id}`}
                        href={href}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 transition-colors hover:border-white/20"
                      >
                        <div className="text-sm font-medium text-white">{result.title}</div>
                        <div className="mt-1 text-xs text-white/70">
                          {result.subtitle ||
                            result.vendor ||
                            (result.kind === "vendor" ? "Vendor" : "Product")}
                        </div>
                        {typeof result.priceCents === "number" ? (
                          <div className="mt-2 text-xs font-medium text-white/85">
                            {formatZAR(result.priceCents)}
                          </div>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-xs text-white/75">
                  {resp.error || "No matching options found yet."}
                </p>
              )}
              {resp.ok ? (
                <Link
                  href={`/search?q=${encodeURIComponent(q.trim())}`}
                  className="mt-3 inline-flex text-xs underline"
                >
                  View full results
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
