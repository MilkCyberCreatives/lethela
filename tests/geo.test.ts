import test from "node:test";
import assert from "node:assert/strict";
import { geocodeSuburb } from "../src/lib/geo";

test("geocodeSuburb resolves known fallback areas", async () => {
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const point = await geocodeSuburb("Midrand");
  assert.deepEqual(point, { lat: -25.9992, lng: 28.1263 });
});

test("geocodeSuburb returns null for unknown areas when every lookup is unavailable", async () => {
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  process.env.NOMINATIM_DISABLED = "true";

  try {
    const point = await geocodeSuburb("Some Unknown Area 987654");
    assert.equal(point, null);
  } finally {
    delete process.env.NOMINATIM_DISABLED;
  }
});

test("geocodeSuburb falls back to the free OpenStreetMap geocoder when no Google key is set", async () => {
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  delete process.env.NOMINATIM_DISABLED;

  const realFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    return new Response(JSON.stringify([{ lat: "-26.2041", lon: "28.0473" }]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const point = await geocodeSuburb("17 Random Street, Some Unlisted Suburb");
    assert.deepEqual(point, { lat: -26.2041, lng: 28.0473 });
    assert.ok(
      calls.some((url) => url.includes("nominatim") && url.includes("/search")),
      "expected a Nominatim search request",
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});
